import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Bell, Eye, EyeOff, Plane } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../services/supabase";
import HeaderBubbles from "../../components/HeaderBubbles";

async function fetchHomeData(userId: string) {
  const [{ data: summary }, { data: primaryGoal }] = await Promise.all([
    supabase.from("user_savings_summary").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);
  return { summary, primaryGoal };
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [showBalance, setShowBalance] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        supabase
          .from("users")
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile?.full_name) setFullName(profile.full_name.split(" ")[0]);
          });
      }
    });
  }, []);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["home", userId],
    queryFn: () => fetchHomeData(userId as string),
    enabled: !!userId,
  });

  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalBalance = data?.summary?.account_balance ?? 0;
  const totalSaved = data?.summary?.total_savings ?? 0;
  const primaryGoal = data?.primaryGoal;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3461FD" />
      }
    >
      {/* Navy header — pt/pb scale with device width so it reads
          proportionally taller on larger phones/tablets too */}
      <View className="bg-navy pt-24 pb-12 px-6 rounded-b-[40px] overflow-hidden">
        <HeaderBubbles />
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text className="text-blue-300 text-base">{greeting},</Text>
            <Text className="text-white text-4xl font-extrabold mt-1">
              Welcome, {fullName || "there"}. 👋
            </Text>
            <Text className="text-blue-300 text-sm mt-2">{today}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            className="w-11 h-11 rounded-full bg-white/15 items-center justify-center"
          >
            <Bell size={20} color="#fff" />
            <View className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-red-500" />
          </Pressable>
        </View>
      </View>

      <View className="px-6">
        {/* Accounts */}
        <Text className="text-sm font-bold text-gray-400 tracking-wide mt-6 mb-3">
          ACCOUNTS
        </Text>
        <View className="bg-gray-50 rounded-2xl p-5">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-500 text-sm">Current Balance</Text>
            <Pressable onPress={() => setShowBalance((s) => !s)}>
              {showBalance ? (
                <Eye size={18} color="#9CA3AF" />
              ) : (
                <EyeOff size={18} color="#9CA3AF" />
              )}
            </Pressable>
          </View>
          <Text className="text-navy text-4xl font-extrabold mt-1">
            {showBalance ? `RM ${totalBalance.toFixed(2)}` : "RM ••••"}
          </Text>

          <View className="h-px bg-gray-200 my-4" />

          <View>
            <Text className="text-gray-500 text-sm">Current Saving</Text>
            <Text className="text-primary text-2xl font-extrabold mt-1">
              RM {totalSaved.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Top Goal */}
        {primaryGoal && (
          <>
            <Text className="text-sm font-bold text-gray-400 tracking-wide mt-6 mb-3">
              TOP GOAL
            </Text>
            <View className="bg-gray-50 rounded-2xl p-5 flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mr-3">
                <Plane size={20} color="#2563EB" />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between">
                  <Text className="font-bold text-gray-900 text-base">{primaryGoal.name}</Text>
                  <Pressable onPress={() => navigation.navigate("Goals")}>
                    <Text className="text-primary text-sm font-semibold">See all</Text>
                  </Pressable>
                </View>
                {primaryGoal.target_date && (
                  <Text className="text-gray-400 text-sm mt-0.5">
                    Target:{" "}
                    {new Date(primaryGoal.target_date).toLocaleDateString("en-MY", {
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                )}
                <View className="h-2.5 bg-gray-200 rounded-full mt-3 overflow-hidden">
                  <View
                    className="h-2.5 bg-primary rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (primaryGoal.current_amount / primaryGoal.target_amount) * 100
                      )}%`,
                    }}
                  />
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-primary text-sm font-semibold">
                    RM {Number(primaryGoal.current_amount).toFixed(0)} saved
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {Math.round(
                      (primaryGoal.current_amount / primaryGoal.target_amount) * 100
                    )}
                    % of RM {Number(primaryGoal.target_amount).toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}