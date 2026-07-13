import React from "react";
import { View, Text, Pressable } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, Wallet, QrCode, Target, User } from "lucide-react-native";
import type { MainTabParamList } from "./types";
import HomeScreen from "../screens/home/HomeScreen";
import AccountsScreen from "../screens/accounts/AccountsScreen";
import ScanScreen from "../screens/scan/ScanScreen";
import GoalsScreen from "../screens/goals/GoalsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

// ---------------------------------------------------------------------
// Custom tab bar: Home, Accounts, [Scan - floating center], Goals, Profile
// ---------------------------------------------------------------------
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const icons: Record<string, any> = {
    Home,
    Accounts: Wallet,
    Scan: QrCode,
    Goals: Target,
    Profile: User,
  };

  return (
    <View className="flex-row items-end bg-white border-t border-gray-100 px-2 pb-6 pt-2">
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const Icon = icons[route.name];
        const label = route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (route.name === "Scan") {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center -mt-8"
            >
              <View className="w-16 h-16 rounded-full bg-navy items-center justify-center shadow-lg">
                <Icon size={26} color="#fff" />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} className="flex-1 items-center pt-2">
            <Icon size={24} color={isFocused ? "#3461FD" : "#9CA3AF"} />
            <Text
              className={`text-sm mt-1 ${
                isFocused ? "text-primary font-semibold" : "text-gray-400"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}