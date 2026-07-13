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
  Alert,
} from "react-native";
import { ChevronLeft, PlusCircle } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../services/supabase";
import { depositSavings } from "../../services/stellar";

export default function AddSavingsScreen() {
  const navigation = useNavigation<any>();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newTotal, setNewTotal] = useState(0);

  const handleAddSavings = async () => {
    setError(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
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

      // Manual top-up isn't tied to a purchase, so no transaction row —
      // savings can exist standalone (transaction_id is nullable).
      const { data: savingsRow, error: insertError } = await supabase
        .from("savings")
        .insert({
          user_id: userId,
          transaction_id: null,
          wallet_id: wallet.id,
          amount: numAmount,
          ledger_type: "balance",
          status: "pending",
        })
        .select()
        .single();

      if (insertError || !savingsRow) {
        setError("Couldn't record this deposit. Please try again.");
        return;
      }

      try {
        const amountCents = Math.round(numAmount * 100);
        const txHash = await depositSavings(secretKey, wallet.stellar_public_key, amountCents);

        const { error: confirmError } = await supabase
          .from("savings")
          .update({ status: "confirmed", stellar_tx_hash: txHash })
          .eq("id", savingsRow.id);

        if (confirmError) {
          console.warn("Failed to mark savings as confirmed:", confirmError.message);
        }
      } catch (chainErr: any) {
        await supabase
          .from("savings")
          .update({
            status: "failed",
            error_message: chainErr?.message ?? "On-chain deposit failed",
          })
          .eq("id", savingsRow.id);
        setError("The blockchain deposit failed. Please try again.");
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
          <PlusCircle size={32} color="#3461FD" />
        </View>
        <Text className="text-2xl font-extrabold text-gray-900 text-center">
          Savings Added
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          RM {amount} was added to your vault on the Stellar blockchain.
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
          <Text className="text-xl font-bold text-navy">Add Savings</Text>
        </View>

        <View className="px-6">
          <Text className="text-gray-500 mb-6">
            Top up your savings vault directly — this deposits real testnet XLM
            value into your Stellar savings contract.
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
            onPress={handleAddSavings}
            disabled={isSubmitting}
            className="bg-navy rounded-2xl h-14 items-center justify-center mt-6 active:opacity-80"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Add Savings</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}