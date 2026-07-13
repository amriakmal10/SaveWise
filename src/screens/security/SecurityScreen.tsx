import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ChevronLeft, User, Mail, Lock, KeyRound } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { supabase } from "../../services/supabase";
import { getPasscodeHashKey } from "../../utils/passcodeConstants";

export default function SecurityScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="flex-row items-center px-6 pt-14 pb-4">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <ChevronLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-navy">Security</Text>
      </View>

      <View className="px-6 gap-6">
        <UsernameSection />
        <ContactEmailSection />
        <PasswordSection />
        <PasscodeSection />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------
// Shared section shell
// ---------------------------------------------------------------------
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-gray-50 rounded-2xl p-4">
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-2">
          {icon}
        </View>
        <Text className="font-bold text-gray-900">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FieldInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className="bg-white rounded-xl px-4 h-12 text-base text-gray-900 mb-3 border border-gray-200"
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
}

function SaveButton({
  onPress,
  isSubmitting,
  label = "Save",
}: {
  onPress: () => void;
  isSubmitting: boolean;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isSubmitting}
      className="bg-navy rounded-xl h-12 items-center justify-center active:opacity-80"
    >
      {isSubmitting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white font-semibold">{label}</Text>
      )}
    </Pressable>
  );
}

function FeedbackText({ error, success }: { error: string | null; success: string | null }) {
  if (error) return <Text className="text-red-500 text-xs mb-2">{error}</Text>;
  if (success) return <Text className="text-green-600 text-xs mb-2">{success}</Text>;
  return null;
}

// ---------------------------------------------------------------------
// Username
// ---------------------------------------------------------------------
function UsernameSection() {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.username) setUsername(profile.username);
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error: updateError } = await supabase
        .from("users")
        .update({ username: username.trim() })
        .eq("id", userData.user.id);

      if (updateError) {
        if (updateError.code === "23505") {
          setError("That username is already taken");
        } else {
          setError("Couldn't update username. Please try again.");
        }
        return;
      }
      setSuccess("Username updated");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section icon={<User size={16} color="#3461FD" />} title="Username">
      <FieldInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholder="Username"
      />
      <FeedbackText error={error} success={success} />
      <SaveButton onPress={handleSave} isSubmitting={isSubmitting} />
    </Section>
  );
}

// ---------------------------------------------------------------------
// Contact Email (informational only — not used for sign-in)
// ---------------------------------------------------------------------
function ContactEmailSection() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("contact_email")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.contact_email) setEmail(profile.contact_email);
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error: updateError } = await supabase
        .from("users")
        .update({ contact_email: email.trim() || null })
        .eq("id", userData.user.id);

      if (updateError) {
        setError("Couldn't update email. Please try again.");
        return;
      }
      setSuccess("Contact email updated");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section icon={<Mail size={16} color="#3461FD" />} title="Contact Email">
      <FieldInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com (optional)"
      />
      <FeedbackText error={error} success={success} />
      <SaveButton onPress={handleSave} isSubmitting={isSubmitting} />
    </Section>
  );
}

// ---------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) return;

      // Re-verify current password before allowing a change
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        setError("Current password is incorrect");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section icon={<Lock size={16} color="#3461FD" />} title="Password">
      <FieldInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        placeholder="Current password"
      />
      <FieldInput
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholder="New password (min. 8 characters)"
      />
      <FieldInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Confirm new password"
      />
      <FeedbackText error={error} success={success} />
      <SaveButton onPress={handleSave} isSubmitting={isSubmitting} label="Update Password" />
    </Section>
  );
}

// ---------------------------------------------------------------------
// Passcode
// ---------------------------------------------------------------------
function PasscodeSection() {
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hash = async (code: string) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, code);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!/^\d{6}$/.test(currentCode)) {
      setError("Enter your current 6-digit passcode");
      return;
    }
    if (!/^\d{6}$/.test(newCode)) {
      setError("New passcode must be 6 digits");
      return;
    }
    if (newCode !== confirmCode) {
      setError("New passcodes do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const storedHash = await SecureStore.getItemAsync(getPasscodeHashKey(user.id));
      const currentHash = await hash(currentCode);

      if (currentHash !== storedHash) {
        setError("Current passcode is incorrect");
        return;
      }

      const newHash = await hash(newCode);
      await SecureStore.setItemAsync(getPasscodeHashKey(user.id), newHash);

      setSuccess("Passcode updated");
      setCurrentCode("");
      setNewCode("");
      setConfirmCode("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section icon={<KeyRound size={16} color="#3461FD" />} title="Passcode">
      <FieldInput
        value={currentCode}
        onChangeText={setCurrentCode}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
        placeholder="Current 6-digit passcode"
      />
      <FieldInput
        value={newCode}
        onChangeText={setNewCode}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
        placeholder="New 6-digit passcode"
      />
      <FieldInput
        value={confirmCode}
        onChangeText={setConfirmCode}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
        placeholder="Confirm new passcode"
      />
      <FeedbackText error={error} success={success} />
      <SaveButton onPress={handleSave} isSubmitting={isSubmitting} label="Update Passcode" />
    </Section>
  );
}