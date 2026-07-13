import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Bell, ShieldCheck, Info, ChevronRight, LogOut } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import HeaderBubbles from "../../components/HeaderBubbles";

async function fetchProfileData(userId: string) {
  const [{ data: profile }, { data: wallet }, { data: summary }, { data: goalsSummary }] =
    await Promise.all([
      supabase.from("users").select("full_name, username").eq("id", userId).maybeSingle(),
      supabase
        .from("wallets")
        .select("stellar_public_key")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("user_savings_summary").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_goals_summary").select("*").eq("user_id", userId).maybeSingle(),
    ]);

  return { profile, wallet, summary, goalsSummary };
}

function formatWalletAddress(key: string) {
  if (key.length <= 10) return key;
  return `${key.slice(0, 5)}...${key.slice(-4)}`;
}

export default function ProfileScreen() {
  const { lock } = useAuth();
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfileData(userId as string),
    enabled: !!userId,
  });

  const fullName = data?.profile?.full_name ?? "";
  const username = data?.profile?.username ?? "";
  const walletAddress = data?.wallet?.stellar_public_key;
  const totalSaved = data?.summary?.total_savings ?? 0;
  const totalTransactions = data?.summary?.total_transactions ?? 0;
  const activeGoals = data?.goalsSummary?.active_goals ?? 0;

  const initial = fullName ? fullName.trim().charAt(0).toUpperCase() : "?";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    lock();
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3461FD" />
      }
    >
      {/* Navy header with profile info */}
      <View className="bg-navy pt-24 pb-12 px-6 rounded-b-[40px] overflow-hidden">
        <HeaderBubbles />
        <View className="flex-row items-center">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4">
            <Text className="text-white text-2xl font-bold">{initial}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">{fullName || "—"}</Text>
            <Text className="text-blue-300 text-sm mt-0.5">
              {username ? `@${username}` : ""}
            </Text>
            {walletAddress && (
              <View className="bg-white/15 self-start rounded-full px-3 py-1 mt-2">
                <Text className="text-white text-xs">{formatWalletAddress(walletAddress)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="px-6">
        {/* Stats */}
        <View className="flex-row justify-between mt-6 gap-3">
          <StatCard label="Total Saved" value={`RM ${totalSaved.toFixed(2)}`} />
          <StatCard label="Transactions" value={String(totalTransactions)} />
          <StatCard label="Goals" value={String(activeGoals)} />
        </View>

        {/* Settings */}
        <View className="mt-6 bg-gray-50 rounded-2xl overflow-hidden">
          <SettingsRow
            icon={<Bell size={18} color="#3461FD" />}
            title="Notifications"
            subtitle="Push, Email"
            onPress={() => navigation.navigate("Notifications")}
          />
          <View className="h-px bg-gray-200 mx-4" />
          <SettingsRow
            icon={<ShieldCheck size={18} color="#3461FD" />}
            title="Security"
            subtitle="Change email, password, 2FA"
            onPress={() => navigation.navigate("Security")}
          />
          <View className="h-px bg-gray-200 mx-4" />
          <SettingsRow
            icon={<Info size={18} color="#3461FD" />}
            title="About SaveWise"
            subtitle="Version 1.0.0"
            onPress={() => navigation.navigate("About")}
          />
        </View>

        {/* Log Out */}
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center bg-red-50 rounded-2xl h-14 mt-6 active:opacity-80"
        >
          <LogOut size={18} color="#DC2626" />
          <Text className="text-red-600 font-semibold ml-2">Log Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-gray-50 rounded-2xl p-4 items-center">
      <Text className="text-navy font-bold text-base">{value}</Text>
      <Text className="text-gray-400 text-xs mt-1 text-center">{label}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-4 active:bg-gray-100">
      <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-900">{title}</Text>
        <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>
      </View>
      <ChevronRight size={18} color="#9CA3AF" />
    </Pressable>
  );
}