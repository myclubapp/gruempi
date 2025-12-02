-- Fix generate_verification_token function to use correct schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_verification_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'gruempi_verify_' || encode(extensions.gen_random_bytes(16), 'hex');
END;
$function$;