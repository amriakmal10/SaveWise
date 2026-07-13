import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ArrowDown } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../services/supabase";

async function fetchGoals(userId: string) {
  const { data } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default function TransferScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: goals = [] } = useQuery({
    queryKey: ["transferGoals", userId],
    queryFn: () => fetchGoals(userId as string),
    enabled: !!userId,
  });

  const sourceGoal = goals.find((g: any) => g.id === sourceId);
  const destinationGoal = goals.find((g: any) => g.id === destinationId);

  const handleTransfer = async () => {
    setError(null);
    if (!sourceId || !destinationId) {
      setError("Select both a source and destination goal");
      return;
    }
    if (sourceId === destinationId) {
      setError("Source and destination must be different goals");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (sourceGoal && numAmount > Number(sourceGoal.current_amount)) {
      setError("Amount exceeds the source goal's balance");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: result, error: rpcError } = await supabase.rpc("transfer_between_goals", {
        p_source_goal_id: sourceId,
        p_destination_goal_id: destinationId,
        p_amount: numAmount,
      });

      if (rpcError || !result) {
        setError(rpcError?.message ?? "Transfer failed. Please try again.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      queryClient.invalidateQueries({ queryKey: ["home", userId] });
      queryClient.invalidateQueries({ queryKey: ["accounts", userId] });
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-2xl font-extrabold text-gray-900 text-center mb-2">
          Transfer Complete
        </Text>
        <Text className="text-gray-500 text-center mb-8">
          RM {amount} moved from {sourceGoal?.name} to {destinationGoal?.name}.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="bg-navy rounded-2xl h-14 items-center justify-center w-full active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-center px-6 pt-14 pb-4">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <ChevronLeft size={20} color="#374151" />
          </Pressable>
          <Text className="text-xl font-bold text-navy">Transfer Funds</Text>
        </View>

        <View className="px-6">
          {goals.length < 2 ? (
            <Text className="text-gray-400 text-center mt-10">
              You need at least 2 active goals to transfer funds between them.
            </Text>
          ) : (
            <>
              <Text className="text-xs font-bold text-gray-400 tracking-wide mb-2">
                FROM
              </Text>
              <GoalPicker
                goals={goals}
                selectedId={sourceId}
                onSelect={setSourceId}
                excludeId={destinationId}
              />

              <View className="items-center my-3">
                <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <ArrowDown size={16} color="#374151" />
                </View>
              </View>

              <Text className="text-xs font-bold text-gray-400 tracking-wide mb-2">
                TO
              </Text>
              <GoalPicker
                goals={goals}
                selectedId={destinationId}
                onSelect={setDestinationId}
                excludeId={sourceId}
              />

              <Text className="text-xs font-bold text-gray-400 tracking-wide mt-6 mb-2">
                AMOUNT (RM)
              </Text>
              <TextInput
                className="bg-gray-100 rounded-2xl px-4 h-14 text-base text-gray-900"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
              {sourceGoal && (
                <Text className="text-gray-400 text-xs mt-1.5">
                  Available in {sourceGoal.name}: RM{" "}
                  {Number(sourceGoal.current_amount).toFixed(2)}
                </Text>
              )}

              {error && (
                <View className="bg-red-50 rounded-xl px-4 py-3 mt-4">
                  <Text className="text-red-600 text-sm">{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleTransfer}
                disabled={isSubmitting}
                className="bg-navy rounded-2xl h-14 items-center justify-center mt-6 active:opacity-80"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Transfer</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoalPicker({
  goals,
  selectedId,
  onSelect,
  excludeId,
}: {
  goals: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  excludeId: string | null;
}) {
  return (
    <View className="gap-2">
      {goals
        .filter((g) => g.id !== excludeId)
        .map((goal) => {
          const isSelected = goal.id === selectedId;
          return (
            <Pressable
              key={goal.id}
              onPress={() => onSelect(goal.id)}
              className={`flex-row justify-between items-center rounded-2xl p-4 border ${
                isSelected ? "border-primary bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <Text className="font-semibold text-gray-900">{goal.name}</Text>
              <Text className="text-gray-500 text-sm">
                RM {Number(goal.current_amount).toFixed(2)}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}