import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Users, Shuffle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface GroupManagementProps {
  tournamentId: string;
}

interface Group {
  id: string;
  name: string;
  category_id: string;
}

interface Team {
  id: string;
  name: string;
  category_id: string;
}

interface TeamAssignment {
  team_id: string;
  group_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function GroupManagement({ tournamentId }: GroupManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadGroupsAndTeams();
    }
  }, [selectedCategoryId]);

  const loadData = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("tournament_categories")
        .select("id, name")
        .eq("tournament_id", tournamentId)
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
      
      if (categoriesData && categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const loadGroupsAndTeams = async () => {
    try {
      const [groupsRes, teamsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("tournament_groups")
          .select("*")
          .eq("category_id", selectedCategoryId)
          .order("name"),
        supabase
          .from("teams")
          .select("id, name, category_id")
          .eq("category_id", selectedCategoryId)
          .order("name"),
        supabase
          .from("team_group_assignments")
          .select("team_id, group_id")
          .in("team_id", (await supabase.from("teams").select("id").eq("category_id", selectedCategoryId)).data?.map(t => t.id) || [])
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (teamsRes.error) throw teamsRes.error;

      setGroups(groupsRes.data || []);
      setTeams(teamsRes.data || []);

      const assignmentMap: Record<string, string | null> = {};
      (assignmentsRes.data || []).forEach((a) => {
        assignmentMap[a.team_id] = a.group_id;
      });
      setAssignments(assignmentMap);
    } catch (error) {
      console.error("Error loading groups and teams:", error);
      toast.error("Fehler beim Laden der Gruppen und Teams");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Bitte gib einen Gruppennamen ein");
      return;
    }

    try {
      const { error } = await supabase
        .from("tournament_groups")
        .insert([{
          tournament_id: tournamentId,
          category_id: selectedCategoryId,
          name: newGroupName,
        }]);

      if (error) throw error;

      toast.success("Gruppe erstellt");
      setNewGroupName("");
      loadGroupsAndTeams();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Fehler beim Erstellen der Gruppe");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from("tournament_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;

      toast.success("Gruppe gelöscht");
      loadGroupsAndTeams();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Fehler beim Löschen der Gruppe");
    }
  };

  const handleAssignTeam = async (teamId: string, groupId: string | null) => {
    try {
      // Delete existing assignment
      await supabase
        .from("team_group_assignments")
        .delete()
        .eq("team_id", teamId);

      // Create new assignment if group selected
      if (groupId) {
        const { error } = await supabase
          .from("team_group_assignments")
          .insert([{ team_id: teamId, group_id: groupId }]);

        if (error) throw error;
      }

      setAssignments({ ...assignments, [teamId]: groupId });
      toast.success("Team zugewiesen");
    } catch (error) {
      console.error("Error assigning team:", error);
      toast.error("Fehler beim Zuweisen des Teams");
    }
  };

  const handleAutoDistribute = async () => {
    if (groups.length === 0) {
      toast.error("Bitte erstelle zuerst Gruppen");
      return;
    }

    try {
      // Delete all existing assignments for this category
      const teamIds = teams.map(t => t.id);
      await supabase
        .from("team_group_assignments")
        .delete()
        .in("team_id", teamIds);

      // Distribute teams evenly across groups
      const newAssignments: { team_id: string; group_id: string }[] = [];
      teams.forEach((team, index) => {
        const groupIndex = index % groups.length;
        newAssignments.push({
          team_id: team.id,
          group_id: groups[groupIndex].id,
        });
      });

      const { error } = await supabase
        .from("team_group_assignments")
        .insert(newAssignments);

      if (error) throw error;

      toast.success("Teams automatisch verteilt");
      loadGroupsAndTeams();
    } catch (error) {
      console.error("Error auto-distributing teams:", error);
      toast.error("Fehler beim automatischen Verteilen");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kategorie wählen</CardTitle>
          <CardDescription>Wähle eine Kategorie, um Gruppen zu verwalten</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCategoryId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gruppen erstellen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="z.B. Gruppe A"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <Button onClick={handleCreateGroup}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erstellen
                </Button>
              </div>

              <div className="space-y-2">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{group.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Gruppe löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Alle Teamzuweisungen zu dieser Gruppe werden entfernt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teams zuweisen</CardTitle>
                  <CardDescription>Weise Teams manuell Gruppen zu oder verteile automatisch</CardDescription>
                </div>
                <Button onClick={handleAutoDistribute} variant="outline">
                  <Shuffle className="h-4 w-4 mr-2" />
                  Automatisch verteilen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span>{team.name}</span>
                    <Select
                      value={assignments[team.id] || ""}
                      onValueChange={(value) => handleAssignTeam(team.id, value || null)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Keine Gruppe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Keine Gruppe</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {teams.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Teams in dieser Kategorie registriert
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}