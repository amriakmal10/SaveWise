import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "./MainTabs";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import SecurityScreen from "../screens/security/SecurityScreen";
import AboutScreen from "../screens/about/AboutScreen";
import AnalyticsScreen from "../screens/analytics/AnalyticsScreen";
import TransferScreen from "../screens/transfer/TransferScreen";
import AddSavingsScreen from "../screens/addsavings/AddSavingsScreen";
import WithdrawScreen from "../screens/withdraw/WithdrawScreen";

export type MainStackParamList = {
  MainTabs: undefined;
  Notifications: undefined;
  Security: undefined;
  About: undefined;
  Analytics: undefined;
  Transfer: undefined;
  AddSavings: undefined;
  Withdraw: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ presentation: "card" }}
      />
      <Stack.Screen name="About" component={AboutScreen} options={{ presentation: "card" }} />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="Transfer"
        component={TransferScreen}
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="AddSavings"
        component={AddSavingsScreen}
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="Withdraw"
        component={WithdrawScreen}
        options={{ presentation: "card" }}
      />
    </Stack.Navigator>
  );
}