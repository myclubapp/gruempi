import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, parse, setHours, setMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { GripVertical, Clock, Save } from "lucide-react";
import { toast } from "sonner";

export interface ScheduleMatch {
  id?: string;
  home_team_id: string | null;
  away_team_id: string | null;
  group_id: string | null;
  scheduled_time: Date;
  field_number: number;
  match_number: number;
  match_type: string;
  homeTeamName?: string;
  awayTeamName?: string;
  groupName?: string;
  categoryName?: string;
  home_placeholder?: string;
  away_placeholder?: string;
}

interface ScheduleEditorProps {
  matches: ScheduleMatch[];
  onMatchesChange: (matches: ScheduleMatch[]) => void;
  onSave: () => void;
  loading: boolean;
  isSaved?: boolean;
}

export default function ScheduleEditor({
  matches,
  onMatchesChange,
  onSave,
  loading,
  isSaved = false,
}: ScheduleEditorProps) {
  const [draggedMatch, setDraggedMatch] = useState<ScheduleMatch | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string>("");
  const dragOverRef = useRef<{ time: string; field: number } | null>(null);

  // Group matches by time slot
  const timeSlots = new Map<string, ScheduleMatch[]>();
  const sortedMatches = [...matches].sort(
    (a, b) => a.scheduled_time.getTime() - b.scheduled_time.getTime()
  );

  sortedMatches.forEach((match) => {
    const timeKey = format(match.scheduled_time, "HH:mm", { locale: de });
    if (!timeSlots.has(timeKey)) {
      timeSlots.set(timeKey, []);
    }
    timeSlots.get(timeKey)!.push(match);
  });

  // Get max field number
  const maxField = Math.max(...matches.map((m) => m.field_number), 1);
  const fields = Array.from({ length: maxField }, (_, i) => i + 1);
  const timeKeys = Array.from(timeSlots.keys());

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, match: ScheduleMatch) => {
    setDraggedMatch(match);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", match.match_number.toString());
  };

  const handleDragOver = (
    e: React.DragEvent,
    timeKey: string,
    field: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverRef.current = { time: timeKey, field };
  };

  const handleDragEnd = () => {
    setDraggedMatch(null);
    dragOverRef.current = null;
  };

  const handleDrop = (
    e: React.DragEvent,
    targetTimeKey: string,
    targetField: number
  ) => {
    e.preventDefault();

    if (!draggedMatch) return;

    const targetMatch = matches.find(
      (m) =>
        format(m.scheduled_time, "HH:mm", { locale: de }) === targetTimeKey &&
        m.field_number === targetField
    );

    const sourceTimeKey = format(draggedMatch.scheduled_time, "HH:mm", {
      locale: de,
    });

    // Parse target time
    const targetTime = timeSlots.get(targetTimeKey)?.[0]?.scheduled_time;
    if (!targetTime) return;

    const updatedMatches = matches.map((m) => {
      if (m.match_number === draggedMatch.match_number) {
        // Move dragged match to target position
        return {
          ...m,
          scheduled_time: targetTime,
          field_number: targetField,
        };
      }
      if (
        targetMatch &&
        m.match_number === targetMatch.match_number
      ) {
        // Swap: move target match to source position
        return {
          ...m,
          scheduled_time: draggedMatch.scheduled_time,
          field_number: draggedMatch.field_number,
        };
      }
      return m;
    });

    onMatchesChange(updatedMatches);
    toast.success("Spiele getauscht");
    setDraggedMatch(null);
  };

  // Time editing handlers
  const handleTimeClick = (timeKey: string) => {
    setEditingTimeSlot(timeKey);
    setNewTime(timeKey);
  };

  const handleTimeChange = () => {
    if (!editingTimeSlot || !newTime) return;

    // Parse times
    const [oldHours, oldMinutes] = editingTimeSlot.split(":").map(Number);
    const [newHours, newMinutes] = newTime.split(":").map(Number);

    if (isNaN(newHours) || isNaN(newMinutes)) {
      toast.error("Ungültige Zeitangabe");
      return;
    }

    // Calculate the time difference in milliseconds
    const oldTimeMs = oldHours * 60 * 60 * 1000 + oldMinutes * 60 * 1000;
    const newTimeMs = newHours * 60 * 60 * 1000 + newMinutes * 60 * 1000;
    const timeDiffMs = newTimeMs - oldTimeMs;

    // Find the first match at the edited time slot to get the reference date
    const referenceMatch = matches.find(
      (m) => format(m.scheduled_time, "HH:mm", { locale: de }) === editingTimeSlot
    );
    if (!referenceMatch) return;

    const referenceTime = referenceMatch.scheduled_time.getTime();

    // Update all matches: matches at this time slot and all subsequent matches
    const updatedMatches = matches.map((m) => {
      const matchTime = m.scheduled_time.getTime();
      
      // If match is at or after the edited time slot, shift it
      if (matchTime >= referenceTime) {
        const newDate = new Date(matchTime + timeDiffMs);
        return { ...m, scheduled_time: newDate };
      }
      return m;
    });

    onMatchesChange(updatedMatches);
    setEditingTimeSlot(null);
    toast.success("Zeit geändert - Folgende Spiele wurden angepasst");
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="w-full min-w-[600px]">
          {/* Header row with field numbers */}
          <div
            className="grid gap-3 mb-3"
            style={{
              gridTemplateColumns: `100px repeat(${maxField}, 1fr)`,
            }}
          >
            <div className="font-medium text-sm text-muted-foreground p-3">
              Zeit
            </div>
            {fields.map((field) => (
              <div
                key={field}
                className="font-medium text-sm text-center p-3 bg-muted rounded-lg"
              >
                Platz {field}
              </div>
            ))}
          </div>

          {/* Match rows by time slot */}
          {timeKeys.map((timeKey, idx) => {
            const matchesAtTime = timeSlots.get(timeKey)!;
            const isKOPhase = matchesAtTime.some((m) => m.match_type !== "group");

            // Check for break before this slot
            let showBreak = false;
            if (idx > 0) {
              const prevTime = timeSlots.get(timeKeys[idx - 1])![0].scheduled_time;
              const currTime = matchesAtTime[0].scheduled_time;
              const diffMinutes =
                (currTime.getTime() - prevTime.getTime()) / 60000;
              if (diffMinutes > 30) {
                showBreak = true;
              }
            }

            return (
              <div key={timeKey}>
                {showBreak && (
                  <div
                    className="grid gap-3 my-3"
                    style={{
                      gridTemplateColumns: `100px repeat(${maxField}, 1fr)`,
                    }}
                  >
                    <div></div>
                    <div
                      className="text-center py-3 text-sm text-muted-foreground bg-muted/50 rounded-lg border-dashed border"
                      style={{ gridColumn: `span ${maxField}` }}
                    >
                      ⏸ Pause
                    </div>
                  </div>
                )}
                <div
                  className="grid gap-3 mb-3"
                  style={{
                    gridTemplateColumns: `100px repeat(${maxField}, 1fr)`,
                  }}
                >
                  {/* Time slot - clickable to edit */}
                  <button
                    onClick={() => handleTimeClick(timeKey)}
                    className="text-sm font-semibold p-3 flex items-center justify-center gap-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    title="Klicken um Zeit zu ändern"
                  >
                    <Clock className="h-3 w-3" />
                    {timeKey}
                  </button>

                  {/* Field slots */}
                  {fields.map((field) => {
                    const match = matchesAtTime.find(
                      (m) => m.field_number === field
                    );

                    if (!match) {
                      return (
                        <div
                          key={field}
                          className="p-3 border border-dashed rounded-lg bg-muted/10 min-h-[120px]"
                          onDragOver={(e) => handleDragOver(e, timeKey, field)}
                          onDrop={(e) => handleDrop(e, timeKey, field)}
                        />
                      );
                    }

                    const isDragging =
                      draggedMatch?.match_number === match.match_number;

                    return (
                      <div
                        key={field}
                        draggable
                        onDragStart={(e) => handleDragStart(e, match)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, timeKey, field)}
                        onDrop={(e) => handleDrop(e, timeKey, field)}
                        className={`p-4 border rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                          match.match_type !== "group"
                            ? "bg-accent/20 border-accent"
                            : "bg-card"
                        } ${isDragging ? "opacity-50 scale-95" : ""} hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground text-sm">
                              #{match.match_number}
                            </span>
                          </div>
                          <Badge
                            variant={
                              match.match_type !== "group" ? "default" : "outline"
                            }
                            className="text-xs"
                          >
                            {match.categoryName}
                          </Badge>
                        </div>
                        {match.groupName && (
                          <div className="text-muted-foreground text-xs mb-2">
                            {match.groupName}
                          </div>
                        )}
                        <div
                          className="font-medium text-sm truncate"
                          title={match.homeTeamName}
                        >
                          {match.homeTeamName}
                        </div>
                        <div className="text-center text-muted-foreground text-xs py-1">
                          vs
                        </div>
                        <div
                          className="font-medium text-sm truncate"
                          title={match.awayTeamName}
                        >
                          {match.awayTeamName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <Button onClick={onSave} disabled={loading} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {isSaved ? "Änderungen speichern" : "Spielplan speichern"}
      </Button>

      {/* Time edit dialog */}
      <Dialog
        open={editingTimeSlot !== null}
        onOpenChange={(open) => !open && setEditingTimeSlot(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anspielzeit ändern</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Neue Zeit für alle Spiele um {editingTimeSlot}:
            </label>
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTimeSlot(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleTimeChange}>Zeit ändern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
