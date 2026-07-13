import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ArrowDownCircle } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../services/supabase";
import { withdrawSavings } from "../../services/stellar";

async function fetchBalance(userId: string) {
  const { data } = await supabase
    .from("user_savings_summary")
    .select("total_savings")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.total_savings ?? 0;
}

export default function WithdrawScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newTotal, setNewTotal] = useState(0);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: currentBalance = 0, refetch } = useQuery({
    queryKey: ["withdrawBalance", userId],
    queryFn: () => fetchBalance(userId as string),
    enabled: !!userId,
  });

  const handleWithdraw = async () => {
    setError(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (numAmount > currentBalance) {
      setError("Amount exceeds your available balance");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!userId) return;

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, stellar_public_key")
        .eq("user_id", userId)
        .maybeSingle();

      if (!wallet?.stellar_public_key) {
        setError("No Stellar wallet found for this account.");
        return;
      }

      const secretKey = await SecureStore.getItemAsync(`stellar_secret_${userId}`);
      if (!secretKey) {
        setError("Wallet secret key not found on this device.");
        return;
      }

      // Withdrawals are recorded as negative-amount savings rows —
      // no transaction row, since this isn't tied to a purchase.
      const { data: savingsRow, error: insertError } = await supabase
        .from("savings")
        .insert({
          user_id: userId,
          transaction_id: null,
          wallet_id: wallet.id,
          amount: -numAmount,
          ledger_type: "saving",
          status: "pending",
        })
        .select()
        .single();

      if (insertError || !savingsRow) {
        setError("Couldn't record this withdrawal. Please try again.");
        return;
      }

      try {
        const amountCents = Math.round(numAmount * 100);
        const txHash = await withdrawSavings(secretKey, wallet.stellar_public_key, amountCents);

        const { error: confirmError } = await supabase
          .from("savings")
          .update({ status: "confirmed", stellar_tx_hash: txHash })
          .eq("id", savingsRow.id);

        if (confirmError) {
          console.warn("Failed to mark withdrawal as confirmed:", confirmError.message);
        }
      } catch (chainErr: any) {
        await supabase
          .from("savings")
          .update({
            status: "failed",
            error_message: chainErr?.message ?? "On-chain withdrawal failed",
          })
          .eq("id", savingsRow.id);
        setError("The blockchain withdrawal failed. Please try again.");
        return;
      }

      const { data: summary } = await supabase
        .from("user_savings_summary")
        .select("total_savings")
        .eq("user_id", userId)
        .maybeSingle();

      setNewTotal(summary?.total_savings ?? 0);
      setSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-4">
          <ArrowDownCircle size={32} color="#3461FD" />
        </View>
        <Text className="text-2xl font-extrabold text-gray-900 text-center">
          Withdrawal Complete
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          RM {amount} was withdrawn from your Stellar savings vault.
        </Text>
        <View className="bg-blue-50 rounded-2xl p-5 items-center w-full mt-6">
          <Text className="text-primary text-xs font-semibold tracking-wide">
            NEW TOTAL SAVINGS
          </Text>
          <Text className="text-navy text-3xl font-extrabold mt-1">
            RM {newTotal.toFixed(2)}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.goBack()}
          className="bg-navy rounded-2xl h-14 items-center justify-center w-full mt-8 active:opacity-80"
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
          <Text className="text-xl font-bold text-navy">Withdraw</Text>
        </View>

        <View className="px-6">
          <Text className="text-gray-400 text-sm mb-1">Available balance</Text>
          <Text className="text-navy text-2xl font-bold mb-6">
            RM {currentBalance.toFixed(2)}
          </Text>

          <Text className="text-xs font-bold text-gray-400 tracking-wide mb-2">
            AMOUNT (RM)
          </Text>
          <TextInput
            className="bg-gray-100 rounded-2xl px-4 h-16 text-2xl font-bold text-gray-900"
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />

          {error && (
            <View className="bg-red-50 rounded-xl px-4 py-3 mt-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleWithdraw}
            disabled={isSubmitting}
            className="bg-navy rounded-2xl h-14 items-center justify-center mt-6 active:opacity-80"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Withdraw</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}