import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID');
const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');

const getTeamParam = () => VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, domain } = await req.json();
    console.log(`[manage-vercel-domain] Action: ${action}, Domain: ${domain}`);

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      console.error('[manage-vercel-domain] Missing Vercel credentials');
      return new Response(JSON.stringify({ 
        error: 'Vercel API nicht konfiguriert. Bitte VERCEL_API_TOKEN und VERCEL_PROJECT_ID setzen.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // Add domain to Vercel project
    if (action === 'add') {
      console.log(`[manage-vercel-domain] Adding domain ${domain} to project ${VERCEL_PROJECT_ID}`);
      
      const response = await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${getTeamParam()}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: domain }),
        }
      );

      const data = await response.json();
      console.log('[manage-vercel-domain] Add domain response:', JSON.stringify(data));

      if (!response.ok) {
        // Check if domain already exists
        if (data.error?.code === 'domain_already_in_use') {
          return new Response(JSON.stringify({ 
            error: 'Diese Domain ist bereits bei einem anderen Vercel-Projekt registriert.',
            code: 'domain_already_in_use'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ 
          error: data.error?.message || 'Fehler beim Hinzufügen der Domain',
          details: data 
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        domain: data,
        message: 'Domain erfolgreich hinzugefügt'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get domain configuration (DNS records, verification status)
    if (action === 'get-config') {
      console.log(`[manage-vercel-domain] Getting config for domain ${domain}`);
      
      // Get project domain info
      const domainResponse = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${getTeamParam()}`,
        {
          method: 'GET',
          headers,
        }
      );

      const domainData = await domainResponse.json();
      console.log('[manage-vercel-domain] Get domain response:', JSON.stringify(domainData));

      if (!domainResponse.ok) {
        return new Response(JSON.stringify({ 
          error: domainData.error?.message || 'Domain nicht gefunden',
          details: domainData 
        }), {
          status: domainResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get actual DNS configuration recommendations from Vercel
      const configResponse = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config${getTeamParam()}`,
        {
          method: 'GET',
          headers,
        }
      );

      const configData = await configResponse.json();
      console.log('[manage-vercel-domain] Get DNS config response:', JSON.stringify(configData));

      // Build DNS configuration instructions with actual values from API
      const records: Array<{type: string; name: string; value: string; description: string}> = [];

      // Add A record (use recommended or fallback)
      if (configData.recommendedIPv4 && configData.recommendedIPv4.length > 0) {
        const ipValues = configData.recommendedIPv4[0].value;
        if (Array.isArray(ipValues) && ipValues.length > 0) {
          records.push({
            type: 'A',
            name: domain,
            value: ipValues[0],
            description: 'Vercel A Record'
          });
        }
      }
      // Fallback if no recommended IP
      if (records.length === 0) {
        records.push({
          type: 'A',
          name: domain,
          value: '76.76.21.21',
          description: 'Vercel A Record'
        });
      }

      // Add CNAME record with actual value from API
      if (configData.recommendedCNAME && configData.recommendedCNAME.length > 0 && configData.recommendedCNAME[0].value) {
        records.push({
          type: 'CNAME',
          name: `www.${domain}`,
          value: configData.recommendedCNAME[0].value,
          description: 'Vercel CNAME für www'
        });
      } else if (configData.cnames && configData.cnames.length > 0) {
        records.push({
          type: 'CNAME',
          name: `www.${domain}`,
          value: configData.cnames[0],
          description: 'Vercel CNAME für www'
        });
      } else {
        // Fallback to generic CNAME
        records.push({
          type: 'CNAME',
          name: `www.${domain}`,
          value: 'cname.vercel-dns.com',
          description: 'Vercel CNAME für www'
        });
      }

      // Add verification TXT record if needed
      if (domainData.verification && domainData.verification.length > 0) {
        domainData.verification.forEach((v: any) => {
          if (v.type === 'TXT') {
            records.push({
              type: 'TXT',
              name: v.domain,
              value: v.value,
              description: 'Vercel Verification'
            });
          }
        });
      }

      const dnsConfig = {
        domain: domainData.name,
        verified: domainData.verified,
        configured: configData.misconfigured === false,
        misconfigured: configData.misconfigured,
        configuredBy: configData.configuredBy,
        verification: domainData.verification || [],
        records
      };

      return new Response(JSON.stringify({ 
        success: true, 
        config: dnsConfig,
        raw: { domain: domainData, dnsConfig: configData }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify domain
    if (action === 'verify') {
      console.log(`[manage-vercel-domain] Verifying domain ${domain}`);
      
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify${getTeamParam()}`,
        {
          method: 'POST',
          headers,
        }
      );

      const data = await response.json();
      console.log('[manage-vercel-domain] Verify response:', JSON.stringify(data));

      return new Response(JSON.stringify({ 
        success: response.ok, 
        verified: data.verified,
        data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove domain
    if (action === 'remove') {
      console.log(`[manage-vercel-domain] Removing domain ${domain}`);
      
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${getTeamParam()}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify({ 
          error: data.error?.message || 'Fehler beim Entfernen der Domain',
          details: data 
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Domain erfolgreich entfernt'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unbekannte Aktion' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[manage-vercel-domain] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
