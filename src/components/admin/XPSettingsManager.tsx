import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Plus, Trash2, Save, Pencil } from "lucide-react";

export function XPSettingsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [showAddQuest, setShowAddQuest] = useState(false);
  const [newQuest, setNewQuest] = useState({
    name: "",
    description: "",
    points: 10,
    icon: "⭐",
    category: "general",
  });

  // Fetch XP settings
  const { data: xpSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["xp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("xp_settings")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch custom quests
  const { data: customQuests, isLoading: loadingQuests } = useQuery({
    queryKey: ["custom-quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_quests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Update XP setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ id, points, is_active }: { id: string; points?: number; is_active?: boolean }) => {
      const updateData: Record<string, unknown> = {};
      if (points !== undefined) updateData.points = points;
      if (is_active !== undefined) updateData.is_active = is_active;
      
      const { error } = await supabase
        .from("xp_settings")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xp-settings"] });
      toast({ title: "Setting updated", description: "XP setting has been saved." });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create quest mutation
  const createQuestMutation = useMutation({
    mutationFn: async (quest: typeof newQuest) => {
      const { error } = await supabase.from("custom_quests").insert([quest]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-quests"] });
      toast({ title: "Quest created", description: "New quest has been added." });
      setShowAddQuest(false);
      setNewQuest({ name: "", description: "", points: 10, icon: "⭐", category: "general" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete quest mutation
  const deleteQuestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_quests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-quests"] });
      toast({ title: "Quest deleted", description: "Quest has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle quest active status
  const toggleQuestMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("custom_quests")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-quests"] });
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "daily": return "bg-blue-500/20 text-blue-700 border-blue-500/30";
      case "homework": return "bg-green-500/20 text-green-700 border-green-500/30";
      case "participation": return "bg-blue-500/20 text-blue-700 border-blue-500/30";
      case "streaks": return "bg-orange-500/20 text-orange-700 border-orange-500/30";
      case "achievements": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const emojiOptions = ["⭐", "🎯", "🏆", "💎", "🔥", "⚡", "🎮", "📚", "🎓", "🌟", "💪", "🚀"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          XP & Quest Settings
        </CardTitle>
        <CardDescription>
          Configure point values for events and create custom quests for students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="settings">
          <TabsList className="mb-4">
            <TabsTrigger value="settings">XP Settings</TabsTrigger>
            <TabsTrigger value="quests">Custom Quests</TabsTrigger>
          </TabsList>

          {/* XP Settings Tab */}
          <TabsContent value="settings">
            {loadingSettings ? (
              <p className="text-muted-foreground">Loading settings...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Setting</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Points</TableHead>
                    <TableHead className="w-[80px]">Active</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {xpSettings?.map((setting) => (
                    <TableRow key={setting.id}>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(setting.category)}>
                          {setting.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{setting.setting_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {setting.description}
                      </TableCell>
                      <TableCell>
                        {editingId === setting.id ? (
                          <Input
                            type="number"
                            value={editPoints}
                            onChange={(e) => setEditPoints(Number(e.target.value))}
                            className="w-20 h-8"
                          />
                        ) : (
                          <span className="font-bold text-primary">{setting.points}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={setting.is_active}
                          onCheckedChange={(checked) =>
                            updateSettingMutation.mutate({ id: setting.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {editingId === setting.id ? (
                          <Button
                            size="sm"
                            onClick={() => updateSettingMutation.mutate({ id: setting.id, points: editPoints })}
                            disabled={updateSettingMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(setting.id);
                              setEditPoints(setting.points);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Custom Quests Tab */}
          <TabsContent value="quests">
            <div className="flex justify-end mb-4">
              <Dialog open={showAddQuest} onOpenChange={setShowAddQuest}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Quest
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Quest</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Icon</Label>
                      <Select value={newQuest.icon} onValueChange={(v) => setNewQuest({ ...newQuest, icon: v })}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {emojiOptions.map((emoji) => (
                            <SelectItem key={emoji} value={emoji}>
                              {emoji}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Name</Label>
                      <Input
                        className="col-span-3"
                        value={newQuest.name}
                        onChange={(e) => setNewQuest({ ...newQuest, name: e.target.value })}
                        placeholder="Quest name"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Description</Label>
                      <Textarea
                        className="col-span-3"
                        value={newQuest.description}
                        onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })}
                        placeholder="How to complete this quest"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Points</Label>
                      <Input
                        type="number"
                        className="col-span-3"
                        value={newQuest.points}
                        onChange={(e) => setNewQuest({ ...newQuest, points: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Category</Label>
                      <Select value={newQuest.category} onValueChange={(v) => setNewQuest({ ...newQuest, category: v })}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="homework">Homework</SelectItem>
                          <SelectItem value="participation">Participation</SelectItem>
                          <SelectItem value="achievements">Achievements</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={() => createQuestMutation.mutate(newQuest)}
                      disabled={!newQuest.name || createQuestMutation.isPending}
                    >
                      Create Quest
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingQuests ? (
              <p className="text-muted-foreground">Loading quests...</p>
            ) : customQuests?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No custom quests yet. Create one to get started!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Points</TableHead>
                    <TableHead className="w-[100px]">Category</TableHead>
                    <TableHead className="w-[80px]">Active</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customQuests?.map((quest) => (
                    <TableRow key={quest.id}>
                      <TableCell className="text-2xl">{quest.icon}</TableCell>
                      <TableCell className="font-medium">{quest.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {quest.description}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">{quest.points} XP</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(quest.category)}>
                          {quest.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={quest.is_active}
                          onCheckedChange={(checked) =>
                            toggleQuestMutation.mutate({ id: quest.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteQuestMutation.mutate(quest.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}