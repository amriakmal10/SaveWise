import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Plus,
  X,
  Plane,
  Laptop,
  ShieldCheck,
  Home as HomeIcon,
  Car,
  GraduationCap,
  Heart,
  Gift,
  Calendar,
  Check,
} from "lucide-react-native";
import { supabase } from "../../services/supabase";
import HeaderBubbles from "../../components/HeaderBubbles";

// ---------------------------------------------------------------------
// Icon options for goals — key is stored in DB, component is for display
// ---------------------------------------------------------------------
const GOAL_ICONS: Record<string, any> = {
  plane: Plane,
  laptop: Laptop,
  shield: ShieldCheck,
  home: HomeIcon,
  car: Car,
  education: GraduationCap,
  health: Heart,
  gift: Gift,
};

const ICON_COLORS: Record<string, string> = {
  plane: "#2563EB",
  laptop: "#7C3AED",
  shield: "#16A34A",
  home: "#D97706",
  car: "#DC2626",
  education: "#0891B2",
  health: "#DB2777",
  gift: "#CA8A04",
};

// ---------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------
async function fetchGoalsData(userId: string) {
  const [{ data: summary }, { data: goals }] = await Promise.all([
    supabase.from("user_goals_summary").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "completed"])
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  return { summary, goals: goals ?? [] };
}

export default function GoalsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["goals", userId],
    queryFn: () => fetchGoalsData(userId as string),
    enabled: !!userId,
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (goalId: string) => {
      // Unset any existing primary first (partial unique index requires it),
      // then set the chosen goal as primary.
      await supabase
        .from("savings_goals")
        .update({ is_primary: false })
        .eq("user_id", userId)
        .eq("is_primary", true);
      await supabase.from("savings_goals").update({ is_primary: true }).eq("id", goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      queryClient.invalidateQueries({ queryKey: ["home", userId] });
    },
  });

  const summary = data?.summary;
  const goals = data?.goals ?? [];

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3461FD" />
        }
      >
        {/* Navy header block */}
        <View className="bg-navy pt-16 pb-6 px-6 rounded-b-[40px] overflow-hidden">
          <HeaderBubbles />
          <Text className="text-2xl font-bold text-white">Savings Goals</Text>
          <Text className="text-white/70 mt-1 mb-5">Track your progress</Text>

          <View className="flex-row justify-between">
            <StatBlock label="Active Goals" value={String(summary?.active_goals ?? 0)} />
            <StatBlock
              label="Total Target"
              value={`RM ${Number(summary?.total_target ?? 0).toLocaleString()}`}
            />
            <StatBlock label="Achieved" value={`${summary?.percent_achieved ?? 0}%`} />
          </View>
        </View>

        <View className="px-6">
          {/* Goal list */}
          <View className="mt-6 gap-4">
            {isLoading && (
              <ActivityIndicator color="#3461FD" style={{ marginTop: 24 }} />
            )}

            {!isLoading && goals.length === 0 && (
              <View className="items-center mt-10">
                <Text className="text-gray-400 text-center">
                  No goals yet. Tap + to create your first savings goal.
                </Text>
              </View>
            )}

            {goals.map((goal: any) => {
              const Icon = GOAL_ICONS[goal.icon] ?? Plane;
              const color = ICON_COLORS[goal.icon] ?? "#2563EB";
              const isCompleted = goal.status === "completed";
              const percent = Math.min(
                100,
                Math.round((goal.current_amount / goal.target_amount) * 100)
              );

              return (
                <Pressable
                  key={goal.id}
                  onLongPress={() => setPrimaryMutation.mutate(goal.id)}
                  className={`rounded-2xl p-4 ${isCompleted ? "bg-green-50" : "bg-gray-50"}`}
                >
                  <View className="flex-row justify-between items-start mb-1">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${color}1A` }}
                      >
                        <Icon size={18} color={color} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="font-semibold text-gray-900">{goal.name}</Text>
                          {goal.is_primary && !isCompleted && (
                            <View className="bg-primary/10 rounded-full px-2 py-0.5">
                              <Text className="text-primary text-[10px] font-bold">TOP</Text>
                            </View>
                          )}
                          {isCompleted && (
                            <View className="flex-row items-center bg-green-600 rounded-full px-2 py-0.5">
                              <Check size={10} color="#fff" />
                              <Text className="text-white text-[10px] font-bold ml-0.5">
                                COMPLETED
                              </Text>
                            </View>
                          )}
                        </View>
                        {goal.target_date && (
                          <Text className="text-gray-400 text-xs mt-0.5">
                            Target:{" "}
                            {new Date(goal.target_date).toLocaleDateString("en-MY", {
                              month: "short",
                              year: "numeric",
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text
                      className={`font-semibold text-sm ${
                        isCompleted ? "text-green-600" : "text-primary"
                      }`}
                    >
                      {percent}%
                    </Text>
                  </View>

                  <View className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <View
                      className={`h-2 rounded-full ${isCompleted ? "bg-green-600" : "bg-primary"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </View>

                  <View className="flex-row justify-between mt-1.5">
                    <Text
                      className={`text-xs font-medium ${
                        isCompleted ? "text-green-600" : "text-primary"
                      }`}
                    >
                      RM {Number(goal.current_amount).toFixed(0)}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      of RM {Number(goal.target_amount).toFixed(0)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}


            {goals.length > 0 && (
              <Text className="text-gray-300 text-xs text-center mt-1">
                Long-press a goal to set it as your top priority
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating add button */}
      <Pressable
        onPress={() => setModalVisible(true)}
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-primary items-center justify-center shadow-lg active:opacity-80"
      >
        <Plus size={26} color="#fff" />
      </Pressable>

      <AddGoalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userId={userId}
        isFirstGoal={goals.length === 0}
        onCreated={() => {
          setModalVisible(false);
          queryClient.invalidateQueries({ queryKey: ["goals", userId] });
          queryClient.invalidateQueries({ queryKey: ["home", userId] });
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------
// Stat block for header card
// ---------------------------------------------------------------------
function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-white text-lg font-bold">{value}</Text>
      <Text className="text-white/70 text-xs mt-0.5 text-center">{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------
// Add Goal modal
// ---------------------------------------------------------------------
function AddGoalModal({
  visible,
  onClose,
  userId,
  isFirstGoal,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  isFirstGoal: boolean;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string>("plane");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setTargetDate(null);
    setShowDatePicker(false);
    setSelectedIcon("plane");
    setError(null);
  };

  const handleCreate = async () => {
    setError(null);
    if (!userId) return;
    if (!name.trim()) {
      setError("Enter a goal name");
      return;
    }
    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid target amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("savings_goals").insert({
        user_id: userId,
        name: name.trim(),
        icon: selectedIcon,
        target_amount: amount,
        target_date: targetDate ? targetDate.toISOString().split("T")[0] : null,
        is_primary: isFirstGoal, // first goal auto-becomes primary
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      resetForm();
      onCreated();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white rounded-t-3xl p-6 pb-10">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-xl font-bold text-gray-900">New Goal</Text>
            <Pressable
              onPress={() => {
                resetForm();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={16} color="#374151" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Icon picker */}
            <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">ICON</Text>
            <View className="flex-row flex-wrap gap-3 mb-5">
              {Object.entries(GOAL_ICONS).map(([key, Icon]) => {
                const isSelected = selectedIcon === key;
                const color = ICON_COLORS[key];
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedIcon(key)}
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isSelected ? color : `${color}1A`,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: color,
                    }}
                  >
                    <Icon size={20} color={isSelected ? "#fff" : color} />
                  </Pressable>
                );
              })}
            </View>

            {/* Goal name */}
            <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
              GOAL NAME
            </Text>
            <TextInput
              className="bg-gray-100 rounded-2xl px-4 h-14 text-base text-gray-900 mb-5"
              placeholder="e.g. Vacation to Japan"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            {/* Target amount */}
            <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
              TARGET AMOUNT (RM)
            </Text>
            <TextInput
              className="bg-gray-100 rounded-2xl px-4 h-14 text-base text-gray-900 mb-5"
              placeholder="e.g. 5000"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />

            {/* Target date */}
            <Text className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">
              TARGET DATE (OPTIONAL)
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-14 mb-2"
            >
              <Calendar size={18} color="#9CA3AF" />
              <Text
                className={`flex-1 ml-3 text-base ${
                  targetDate ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {targetDate
                  ? targetDate.toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Select a date"}
              </Text>
            </Pressable>
            {targetDate && (
              <Pressable onPress={() => setTargetDate(null)} className="self-end mb-3">
                <Text className="text-red-500 text-xs">Clear date</Text>
              </Pressable>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={targetDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === "ios"); // iOS keeps picker open inline
                  if (event.type === "set" && selectedDate) {
                    setTargetDate(selectedDate);
                  }
                }}
              />
            )}

            <View className="mb-3" />

            {error && (
              <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleCreate}
              disabled={isSubmitting}
              className="bg-primary rounded-2xl h-14 items-center justify-center active:opacity-80"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Create Goal</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}