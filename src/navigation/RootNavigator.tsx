import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { View } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import PasscodeOverlay from "../components/PasscodeOverlay";
import LoadingScreen from "../components/LoadingScreen";

export default function RootNavigator() {
  const { session, hasPasscode, isUnlocked, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }


  if (!session || !hasPasscode) {
    const initialRouteName = !session ? "SignIn" : "PasscodeSetup";
    return (
      <NavigationContainer>
        <AuthNavigator initialRouteName={initialRouteName} />
      </NavigationContainer>
    );
  }


  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <MainNavigator />
        {!isUnlocked && <PasscodeOverlay />}
      </View>
    </NavigationContainer>
  );
}