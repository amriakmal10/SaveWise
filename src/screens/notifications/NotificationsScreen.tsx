import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronLeft, PiggyBank, Target, ShieldAlert, Bell as BellIcon } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../services/supabase";

const TYPE_ICONS: Record<string, any> = {
  savings: PiggyBank,
  goal_milestone: Target,
  security: ShieldAlert,
  system: BellIcon,
};

const TYPE_COLORS: Record<string, string> = {
  savings: "#16A34A",
  goal_milestone: "#2563EB",
  security: "#DC2626",
  system: "#3461FD",
};

async function fetchNotifications(userId: string) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: notifications = [], refetch, isRefetching } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId as string),
    enabled: !!userId,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-6 pt-14 pb-4">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <ChevronLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-navy">Notifications</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3461FD" />
        }
      >
        {notifications.length === 0 && (
          <Text className="text-gray-400 text-center mt-10">No notifications yet.</Text>
        )}

        {notifications.map((n: any) => {
          const Icon = TYPE_ICONS[n.type] ?? BellIcon;
          const color = TYPE_COLORS[n.type] ?? "#3461FD";

          return (
            <Pressable
              key={n.id}
              onPress={() => !n.is_read && markReadMutation.mutate(n.id)}
              className={`flex-row items-start rounded-2xl p-4 mb-3 ${
                n.is_read ? "bg-white border border-gray-100" : "bg-blue-50"
              }`}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${color}1A` }}
              >
                <Icon size={18} color={color} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-gray-900">{n.title}</Text>
                  {!n.is_read && <View className="w-2 h-2 rounded-full bg-primary" />}
                </View>
                <Text className="text-gray-500 text-sm mt-0.5">{n.message}</Text>
                <Text className="text-gray-400 text-xs mt-1.5">
                  {formatRelativeTime(n.created_at)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}