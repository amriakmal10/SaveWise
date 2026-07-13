import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../services/supabase";

const CATEGORY_COLORS: Record<string, string> = {
  coffee: "#D97706",
  grocery: "#2563EB",
  food: "#16A34A",
  transport: "#7C3AED",
  retail: "#DB2777",
  other: "#6B7280",
};

async function fetchAnalyticsData(userId: string) {
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("transacted_at", { ascending: false })
    .limit(200);

  return transactions ?? [];
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: transactions = [], refetch, isRefetching } = useQuery({
    queryKey: ["analytics", userId],
    queryFn: () => fetchAnalyticsData(userId as string),
    enabled: !!userId,
  });

  // --- Last 7 days round-up totals ---
  const last7Days = getLast7Days();
  const dailyTotals = last7Days.map((day) => {
    const dayStr = day.toDateString();
    const total = transactions
      .filter((tx: any) => new Date(tx.transacted_at).toDateString() === dayStr)
      .reduce((sum: number, tx: any) => sum + Number(tx.round_up_amount), 0);
    return { day, total };
  });
  const maxDaily = Math.max(...dailyTotals.map((d) => d.total), 0.01);

  // --- Category breakdown ---
  const categoryTotals: Record<string, number> = {};
  transactions.forEach((tx: any) => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] ?? 0) + Number(tx.round_up_amount);
  });
  const totalSaved = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // --- Top merchants ---
  const merchantTotals: Record<string, number> = {};
  transactions.forEach((tx: any) => {
    merchantTotals[tx.merchant_name] =
      (merchantTotals[tx.merchant_name] ?? 0) + Number(tx.round_up_amount);
  });
  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3461FD" />
      }
    >
      <View className="flex-row items-center px-6 pt-14 pb-4">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <ChevronLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-navy">Analytics</Text>
      </View>

      <View className="px-6">
        {transactions.length === 0 ? (
          <Text className="text-gray-400 text-center mt-10">
            No transactions yet — insights will show up once you start scanning and saving.
          </Text>
        ) : (
          <>
            {/* Last 7 days */}
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3">
              LAST 7 DAYS
            </Text>
            <View className="bg-gray-50 rounded-2xl p-4 mb-6">
              <View className="flex-row justify-between items-end" style={{ height: 100 }}>
                {dailyTotals.map(({ day, total }, i) => (
                  <View key={i} className="items-center flex-1">
                    <View
                      className="w-6 bg-primary rounded-full"
                      style={{
                        height: Math.max(4, (total / maxDaily) * 80),
                      }}
                    />
                    <Text className="text-gray-400 text-[10px] mt-2">
                      {day.toLocaleDateString("en-MY", { weekday: "narrow" })}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="text-center text-gray-500 text-xs mt-3">
                Total this week: RM{" "}
                {dailyTotals.reduce((sum, d) => sum + d.total, 0).toFixed(2)}
              </Text>
            </View>

            {/* Category breakdown */}
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3">
              SAVINGS BY CATEGORY
            </Text>
            <View className="bg-gray-50 rounded-2xl p-4 mb-6 gap-3">
              {sortedCategories.map(([category, amount]) => {
                const percent = totalSaved > 0 ? (amount / totalSaved) * 100 : 0;
                const color = CATEGORY_COLORS[category] ?? "#6B7280";
                return (
                  <View key={category}>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-700 text-sm capitalize">{category}</Text>
                      <Text className="text-gray-900 text-sm font-semibold">
                        RM {amount.toFixed(2)}
                      </Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View
                        className="h-2 rounded-full"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Top merchants */}
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3">
              TOP MERCHANTS
            </Text>
            <View className="bg-gray-50 rounded-2xl p-4 gap-3">
              {topMerchants.map(([merchant, amount], i) => (
                <View key={merchant} className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-7 h-7 rounded-full bg-blue-50 items-center justify-center mr-3">
                      <Text className="text-primary text-xs font-bold">{i + 1}</Text>
                    </View>
                    <Text className="text-gray-800 flex-1" numberOfLines={1}>
                      {merchant}
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-semibold text-sm">
                    RM {amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}