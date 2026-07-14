import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  Wallet,
  Plus,
  ArrowDownLeft,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react-native";
import { supabase } from "../../services/supabase";
import HeaderBubbles from "../../components/HeaderBubbles";
import { useNavigation } from "@react-navigation/native";

// ---------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------
async function fetchAccountsData(userId: string) {
  const [{ data: summary }, { data: goalsSummary }, { data: transactions }] = await Promise.all([
    supabase.from("user_savings_summary").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_goals_summary").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("transacted_at", { ascending: false })
      .limit(20),
  ]);

  return { summary, goalsSummary, transactions: transactions ?? [] };
}

const ANNUAL_YIELD_DISPLAY = "3.50%";

export default function AccountsScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => fetchAccountsData(userId as string),
    enabled: !!userId,
  });

  const totalBalance = data?.summary?.account_balance ?? 0;
  const totalSaving = data?.summary?.total_savings ?? 0;
  const totalTransactions = data?.summary?.total_transactions ?? 0;
  const activeGoals = data?.goalsSummary?.active_goals ?? 0;
  const transactions = data?.transactions ?? [];

  const filteredTransactions = transactions.filter((tx: any) =>
    tx.merchant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const comingSoon = (feature: string) =>
    Alert.alert(feature, "This will be wired up in an upcoming module.");

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3461FD" />
      }
    >
      {/* Navy header */}
      <View className="bg-navy pt-24 pb-12 px-6 rounded-b-[40px] overflow-hidden">
        <HeaderBubbles />
        <Text className="text-2xl font-bold text-white">Accounts</Text>
        <Text className="text-white/60 mt-1">Manage your savings</Text>
      </View>

      <View className="px-6">
        {/* Account Balance */}
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mt-6 mb-2">
          ACCOUNT BALANCE
        </Text>
        <View className="bg-gray-50 rounded-2xl p-4">
          <Text className="text-gray-400 text-xs">Current balance</Text>
          <Text className="text-navy text-2xl font-bold mt-1">RM {totalBalance.toFixed(2)}</Text>

          <View className="flex-row justify-between mt-4 pt-3 border-t border-gray-200">
            <View className="items-center flex-1">
              <Text className="text-primary font-bold">{ANNUAL_YIELD_DISPLAY}</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Annual Yield</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-gray-900 font-bold">{totalTransactions}</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Transactions</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-gray-900 font-bold">{activeGoals}</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Active Goals</Text>
            </View>
          </View>
        </View>

        {/* Total Saving */}
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mt-6 mb-2">
          TOTAL SAVING
        </Text>
        <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-gray-400 text-xs">Saved from round-ups</Text>
            <Text className="text-navy text-xl font-bold mt-1">RM {totalSaving.toFixed(2)}</Text>
            <Text className="text-primary text-xs font-medium mt-1">
              ↗ {totalTransactions} transactions rounded up
            </Text>
          </View>
          <Pressable
            onPress={() => comingSoon("Vault details")}
            className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center"
          >
            <Wallet size={20} color="#3461FD" />
          </Pressable>
        </View>

        {/* Quick Actions */}
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mt-6 mb-3">
          QUICK ACTIONS
        </Text>
        <View className="flex-row justify-between mb-2">
          <AccountAction
            label="Add Balance"
            sublabel="Top up vault"
            bg="bg-navy"
            icon={<Plus size={20} color="#fff" />}
            onPress={() => navigation.navigate("AddSavings")}
          />
          <AccountAction
            label="Withdraw"
            sublabel="Cash out"
            bg="bg-primary"
            icon={<ArrowDownLeft size={20} color="#fff" />}
            onPress={() => navigation.navigate("Withdraw")}
          />
          <AccountAction
            label="Analytics"
            sublabel="View insights"
            bg="bg-purple-600"
            icon={<BarChart3 size={20} color="#fff" />}
            onPress={() => navigation.navigate("Analytics")}
          />
          <AccountAction
            label="Transfer"
            sublabel="Move funds"
            bg="bg-orange-500"
            icon={<ArrowLeftRight size={20} color="#fff" />}
            onPress={() => navigation.navigate("Transfer")}
          />
        </View>

        {/* Transactions */}
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mt-6 mb-2">
          TRANSACTIONS
        </Text>
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 h-12">
            <Search size={16} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 text-sm text-gray-900"
              placeholder="Search merchant..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            onPress={() => comingSoon("Filters")}
            className="w-12 h-12 rounded-2xl bg-gray-100 items-center justify-center"
          >
            <SlidersHorizontal size={18} color="#374151" />
          </Pressable>
        </View>

        {filteredTransactions.length === 0 && (
          <Text className="text-gray-400 text-sm text-center mt-4">
            {transactions.length === 0
              ? "No transactions yet — scan a QR to start saving."
              : "No transactions match your search."}
          </Text>
        )}

        {filteredTransactions.map((tx: any) => (
          <View
            key={tx.id}
            className="flex-row items-center justify-between bg-gray-50 rounded-2xl p-4 mb-3"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-3">
                <Text>☕</Text>
              </View>
              <View>
                <Text className="font-semibold text-gray-900">{tx.merchant_name}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {formatRelativeTime(tx.transacted_at)}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-gray-900 font-medium">
                RM {tx.purchase_amount.toFixed(2)}
              </Text>
              <Text className="text-primary text-xs font-medium mt-0.5">
                +RM {tx.round_up_amount.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function AccountAction({
  label,
  sublabel,
  bg,
  icon,
  onPress,
}: {
  label: string;
  sublabel: string;
  bg: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center" style={{ width: "23%" }}>
      <View className={`w-12 h-12 rounded-2xl ${bg} items-center justify-center mb-1.5`}>
        {icon}
      </View>
      <Text className="text-[11px] font-semibold text-gray-900 text-center">{label}</Text>
      <Text className="text-[10px] text-gray-400 text-center">{sublabel}</Text>
    </Pressable>
  );
}

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { weekday: "short" }) + `, ${time}`;
}