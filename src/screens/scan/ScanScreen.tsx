import React, { useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { CameraView, useCameraPermissions, scanFromURLAsync } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeft,
  Image as ImageIcon,
  CheckCircle2,
  Info,
  Coffee,
  ShoppingBag,
  Utensils,
  Car,
  Package,
} from "lucide-react-native";
import { supabase } from "../../services/supabase";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { depositSavings, withdrawSavings } from "../../services/stellar";

async function processLedgerEntry({
  userId,
  walletId,
  transactionId,
  amount,
  ledgerType,
  secretKey,
  publicKey,
  direction,
}: {
  userId: string;
  walletId: string;
  transactionId: string;
  amount: number;
  ledgerType: "saving" | "balance";
  secretKey: string;
  publicKey: string;
  direction: "deposit" | "withdraw";
}): Promise<boolean> {
  const storedAmount = direction === "withdraw" ? -amount : amount;

  const { data: row, error: insertError } = await supabase
    .from("savings")
    .insert({
      user_id: userId,
      transaction_id: transactionId,
      wallet_id: walletId,
      amount: storedAmount,
      ledger_type: ledgerType,
      status: "pending",
    })
    .select()
    .single();

  if (insertError || !row) return false;

  try {
    const amountCents = Math.round(amount * 100);
    const txHash =
      direction === "deposit"
        ? await depositSavings(secretKey, publicKey, amountCents)
        : await withdrawSavings(secretKey, publicKey, amountCents);

    await supabase
      .from("savings")
      .update({ status: "confirmed", stellar_tx_hash: txHash })
      .eq("id", row.id);

    return true;
  } catch (chainErr: any) {
    await supabase
      .from("savings")
      .update({
        status: "failed",
        error_message: chainErr?.message ?? "On-chain call failed",
      })
      .eq("id", row.id);
    return false;
  }
}

type ScannedPayload = {
  merchant: string;
  amount: number;
  category?: string;
};

const CATEGORY_ICONS: Record<string, any> = {
  coffee: Coffee,
  grocery: ShoppingBag,
  food: Utensils,
  transport: Car,
  retail: ShoppingBag,
  other: Package,
};

type Step = "scan" | "confirm" | "success";

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("scan");
  const [scanned, setScanned] = useState<ScannedPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newTotal, setNewTotal] = useState(0);
  const hasScannedRef = useRef(false);

  const parsePayload = (raw: string): ScannedPayload | null => {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.merchant === "string" && typeof parsed.amount === "number") {
        return {
          merchant: parsed.merchant,
          amount: parsed.amount,
          category: parsed.category ?? "other",
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScannedRef.current) return;
    const payload = parsePayload(data);
    if (!payload) {
      Alert.alert("Invalid QR Code", "This doesn't look like a SaveWise merchant QR.");
      return;
    }
    hasScannedRef.current = true;
    setScanned(payload);
    setStep("confirm");
  };

  const handleScanFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission needed", "Allow photo library access to scan from gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      const results = await scanFromURLAsync(result.assets[0].uri, ["qr"]);
      if (!results || results.length === 0) {
        Alert.alert("No QR Code Found", "Couldn't find a QR code in that image.");
        return;
      }
      const payload = parsePayload(results[0].data);
      if (!payload) {
        Alert.alert("Invalid QR Code", "This doesn't look like a SaveWise merchant QR.");
        return;
      }
      setScanned(payload);
      setStep("confirm");
    } catch (err) {
      Alert.alert("Couldn't Read Image", "Please try a clearer photo of the QR code.");
    }
  };

  const handleConfirm = async () => {
    if (!scanned) return;
    setIsProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const roundedAmount = Math.ceil(scanned.amount / 0.5) * 0.5;
      const roundUpAmount = Number((roundedAmount - scanned.amount).toFixed(2));

      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          merchant_name: scanned.merchant,
          category: scanned.category ?? "other",
          purchase_amount: scanned.amount,
          rounded_amount: roundedAmount,
          round_up_amount: roundUpAmount,
        })
        .select()
        .single();

      if (txError || !tx) {
        Alert.alert("Error", "Couldn't save this transaction. Please try again.");
        return;
      }

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, stellar_public_key")
        .eq("user_id", userId)
        .maybeSingle();

      if (!wallet?.stellar_public_key) {
        Alert.alert("Error", "No Stellar wallet found. Please contact support.");
        return;
      }

      const secretKey = await SecureStore.getItemAsync(`stellar_secret_${userId}`);
      if (!secretKey) {
        Alert.alert("Error", "Wallet secret key not found on this device.");
        return;
      }

      let savingSuccess = true;
      if (roundUpAmount > 0) {
        savingSuccess = await processLedgerEntry({
          userId,
          walletId: wallet.id,
          transactionId: tx.id,
          amount: roundUpAmount,
          ledgerType: "saving",
          secretKey,
          publicKey: wallet.stellar_public_key,
          direction: "deposit",
        });
      }

      if (!savingSuccess) {
        Alert.alert(
          "Blockchain Error",
          "Your transaction was recorded, but the on-chain savings deposit failed. Please try again later."
        );
        return;
      }

      const balanceSuccess = await processLedgerEntry({
        userId,
        walletId: wallet.id,
        transactionId: tx.id,
        amount: roundedAmount,
        ledgerType: "balance",
        secretKey,
        publicKey: wallet.stellar_public_key,
        direction: "withdraw",
      });

      if (!balanceSuccess) {
        Alert.alert(
          "Partial Success",
          "Your savings deposit succeeded, but deducting from your balance failed. Please check your balance later."
        );
        return;
      }

      const { data: summary } = await supabase
        .from("user_savings_summary")
        .select("total_savings")
        .eq("user_id", userId)
        .maybeSingle();

      setNewTotal(summary?.total_savings ?? 0);
      setStep("success");
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToScan = () => {
    hasScannedRef.current = false;
    setScanned(null);
    setStep("scan");
  };

  // ---------------------------------------------------------------------
  // Step: Scan
  // ---------------------------------------------------------------------
  if (step === "scan") {
    if (!permission) {
      return (
        <View className="flex-1 bg-navy items-center justify-center">
          <ActivityIndicator color="#fff" />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View className="flex-1 bg-navy items-center justify-center px-8">
          <Text className="text-white text-lg font-bold text-center mb-2">
            Camera Access Needed
          </Text>
          <Text className="text-white/60 text-center mb-6">
            SaveWise needs camera access to scan merchant QR codes.
          </Text>
          <Pressable
            onPress={requestPermission}
            className="bg-primary rounded-2xl px-6 h-12 items-center justify-center"
          >
            <Text className="text-white font-semibold">Grant Permission</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-navy">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        >
          <View className="flex-1 px-6">
            <View className="flex-row items-center mt-14">
              <Pressable
                onPress={() => navigation.navigate("Home")}
                className="w-9 h-9 rounded-full bg-white/15 items-center justify-center mr-3"
              >
                <ChevronLeft size={20} color="#fff" />
              </Pressable>
              <Text className="text-white text-lg font-bold">Scan Merchant QR</Text>
            </View>
            <Text className="text-white/60 mt-2">
              Point your camera at the merchant's QR code
            </Text>

            {/* Scan frame */}
            <View className="flex-1 items-center justify-center">
              <View style={{ width: 240, height: 240 }}>
                <Corner style={{ top: 0, left: 0 }} />
                <Corner style={{ top: 0, right: 0, transform: [{ rotate: "90deg" }] }} />
                <Corner style={{ bottom: 0, left: 0, transform: [{ rotate: "-90deg" }] }} />
                <Corner style={{ bottom: 0, right: 0, transform: [{ rotate: "180deg" }] }} />
              </View>
            </View>

            <Pressable
              onPress={handleScanFromGallery}
              className="flex-row items-center justify-center bg-primary rounded-2xl h-14 mb-10 active:opacity-80"
            >
              <ImageIcon size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">Scan from Gallery</Text>
            </Pressable>
          </View>
        </CameraView>
      </View>
    );
  }

  // ---------------------------------------------------------------------
  // Step: Confirm Transaction
  // ---------------------------------------------------------------------
  if (step === "confirm" && scanned) {
    const roundedAmount = Math.ceil(scanned.amount / 0.5) * 0.5;
    const roundUpAmount = Number((roundedAmount - scanned.amount).toFixed(2));
    const CategoryIcon = CATEGORY_ICONS[scanned.category ?? "other"] ?? Package;

    return (
      <View className="flex-1 bg-white px-6">
        <View className="flex-row items-center mt-14 mb-6">
          <Pressable
            onPress={resetToScan}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <ChevronLeft size={20} color="#374151" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Confirm Transaction</Text>
        </View>

        <View className="flex-row items-center mb-5">
          <View className="w-12 h-12 rounded-2xl bg-orange-50 items-center justify-center mr-3">
            <CategoryIcon size={22} color="#D97706" />
          </View>
          <View>
            <Text className="font-bold text-gray-900 text-base">{scanned.merchant}</Text>
            <Text className="text-gray-400 text-sm capitalize">
              {scanned.category ?? "other"}
            </Text>
          </View>
        </View>

        <View className="bg-gray-50 rounded-2xl p-4 mb-5">
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">Purchase Amount</Text>
            <Text className="font-semibold text-gray-900">RM {scanned.amount.toFixed(2)}</Text>
          </View>
          <View className="h-px bg-gray-200" />
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">Round Up To</Text>
            <Text className="font-semibold text-gray-900">RM {roundedAmount.toFixed(2)}</Text>
          </View>
          <View className="h-px bg-gray-200" />
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">You Save</Text>
            <Text className="font-bold text-primary">RM {roundUpAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View className="bg-navy rounded-2xl p-5 items-center mb-5">
          <Text className="text-blue-300 text-xs font-semibold tracking-wide">YOU SAVE</Text>
          <Text className="text-white text-3xl font-extrabold mt-1">
            RM {roundUpAmount.toFixed(2)}
          </Text>
          <Text className="text-blue-300 text-xs mt-1">Stored securely on Stellar Blockchain</Text>
        </View>

        <View className="flex-row items-start bg-blue-50 rounded-2xl p-3 mb-6">
          <Info size={16} color="#3461FD" style={{ marginTop: 2 }} />
          <Text className="text-gray-600 text-xs ml-2 flex-1">
            The round-up will be added to your savings.
          </Text>
        </View>

        <Pressable
          onPress={handleConfirm}
          disabled={isProcessing}
          className="bg-navy rounded-2xl h-14 items-center justify-center mb-3 active:opacity-80"
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Confirm Save</Text>
          )}
        </Pressable>
        <Pressable
          onPress={resetToScan}
          disabled={isProcessing}
          className="border border-gray-200 rounded-2xl h-14 items-center justify-center"
        >
          <Text className="text-gray-700 font-semibold text-base">Cancel</Text>
        </Pressable>
      </View>
    );
  }


  if (step === "success" && scanned) {
    const roundedAmount = Math.ceil(scanned.amount / 0.5) * 0.5;
    const roundUpAmount = Number((roundedAmount - scanned.amount).toFixed(2));

    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mb-5">
          <CheckCircle2 size={40} color="#3461FD" />
        </View>
        <Text className="text-2xl font-extrabold text-gray-900 text-center">
          Congratulations!
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          <Text className="font-semibold text-gray-700">RM {roundUpAmount.toFixed(2)}</Text> has
          been added to your savings on the Stellar blockchain.
        </Text>

        <View className="bg-blue-50 rounded-2xl p-5 items-center w-full mt-6">
          <Text className="text-primary text-xs font-semibold tracking-wide">
            NEW TOTAL SAVINGS
          </Text>
          <Text className="text-navy text-3xl font-extrabold mt-1">
            RM {newTotal.toFixed(2)}
          </Text>
          <Text className="text-primary text-xs mt-1">
            ↗ +RM {roundUpAmount.toFixed(2)} just now
          </Text>
        </View>

        <Pressable
          onPress={resetToScan}
          className="bg-navy rounded-2xl h-14 items-center justify-center w-full mt-8 active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Scan Another</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            resetToScan();
            navigation.navigate("Home");
          }}
          className="border border-gray-200 rounded-2xl h-14 items-center justify-center w-full mt-3"
        >
          <Text className="text-gray-700 font-semibold text-base">Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

function Corner({ style }: { style: any }) {
  return (
    <View
      style={[
        {
          position: "absolute",
          width: 32,
          height: 32,
          borderColor: "#3461FD",
          borderTopWidth: 3,
          borderLeftWidth: 3,
          borderTopLeftRadius: 8,
        },
        style,
      ]}
    />
  );
}