import { Category, Expense, PaymentMethod } from "@/types";
import { createNotionTransaction, updateNotionTransaction } from "@/utils/notion";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View
} from "react-native";
import BottomDrawer from "./BottomDrawer";

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  categories?: Category[];
  paymentMethods?: PaymentMethod[];
  initialData?: Expense | null;
}

export default function AddTransactionModal({
  visible,
  onClose,
  categories = [],
  paymentMethods = [],
  initialData,
}: AddTransactionModalProps) {
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(
    null
  );
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [prepared, setPrepared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === "ios");
    setDate(currentDate);
  };

  const handlePress = (value: string) => {
    if (value === "C") {
      setAmount("0");
      return;
    }
    if (value === "DEL") {
      setAmount((prev) => {
        if (prev.length === 1 || (prev.length === 2 && prev.startsWith('-'))) return "0";
        return prev.slice(0, -1);
      });
      return;
    }
    if (value === "=") {
      calculateResult();
      return;
    }

    if (["+", "-", "*", "/"].includes(value)) {
      setAmount((prev) => {
        const lastChar = prev.slice(-1);
        if (["+", "-", "*", "/"].includes(lastChar)) {
          return prev.slice(0, -1) + value;
        }
        return prev + value;
      });
      return;
    }

    setAmount((prev) => (prev === "0" ? value : prev + value));
  };

  const calculateResult = () => {
    try {
      // Basic sanitization to allow only math chars
      const sanitized = amount.replace(/[^0-9+\-*/.]/g, "");
      // eslint-disable-next-line no-new-func
      const result = new Function("return " + sanitized)();
      setAmount(String(result));
    } catch (e) {
      // Ignore invalid calcs
    }
  };

  const keys = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    ".", "0", "=", "+",
  ];

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Success", message);
    }
  };

  const saveTransaction = async () => {
    calculateResult();
    const finalAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));

    if (isNaN(finalAmount) || finalAmount === 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return false;
    }

    setIsSubmitting(true);
    try {
      if (!selectedCategoryId) throw new Error("Please select a category");
      if (!selectedPaymentMethodId) throw new Error("Please select a payment method");

      if (initialData) {
        await updateNotionTransaction(
          initialData.id,
          finalAmount,
          note,
          selectedCategoryId,
          selectedPaymentMethodId,
          date,
          prepared
        );
        showToast("Updated successfully");
      } else {
        await createNotionTransaction(
          finalAmount,
          note,
          selectedCategoryId,
          selectedPaymentMethodId,
          date,
          prepared
        );
        showToast("Added successfully");
      }
      return true;
    } catch (e: any) {
      console.log(e.message);
      Alert.alert("Error", e.message || "Failed to save transaction");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    const success = await saveTransaction();
    if (success) {
      onClose();
    }
  };

  const handleSaveAndContinue = async () => {
    const success = await saveTransaction();
    if (success) {
      setAmount("0");
      setNote("");
      setSelectedCategoryId(null);
      setSelectedPaymentMethodId(null);
      setDate(new Date());
      setPrepared(false);
    }
  };
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setNote(initialData.note);
        setSelectedCategoryId(initialData.categoryId || null);
        setSelectedPaymentMethodId(initialData.paymentMethodId || null);
        setDate(new Date(initialData.date));
        setPrepared(initialData.prepared === 'yes');
      } else {
        setAmount("0");
        setNote("");
        setSelectedCategoryId(null);
        setSelectedPaymentMethodId(null);
        setDate(new Date());
        setPrepared(false);
      }
    }
  }, [visible, initialData])

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      keyboardDidHideListener.remove();
      /* Keyboard listeners removed to allow overlap */
    };
  }, []);

  // ... (existing code for calculateResult, handlePress, handleSave ...)
  const [showDatePicker, setShowDatePicker] = useState(false);

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      title={initialData ? "Edit Record" : "New Record"}
    >
      {/* ... (existing content: Amount Display, Categories, Note Input) ... */}
      <View className="flex-1 flex-col">
        {/* Date Input */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1">
            <Text className="text-gray-500 font-chakra-medium text-sm mb-2 px-1">
              Date
            </Text>
            <TouchableOpacity
              onPress={toggleDatePicker}
              className="bg-gray-50 rounded-xl h-12 justify-center items-center px-2"
            >
              <Text className="text-base font-chakra-medium text-gray-900" numberOfLines={1}>
                {date.toLocaleDateString('en-GB')}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-[1.5]">
            <Text className="text-gray-500 font-chakra-medium text-sm mb-2 px-1">
              Payment
            </Text>
            <TouchableOpacity
              onPress={() => setShowPaymentPicker(true)}
              className="bg-gray-50 rounded-xl h-12 flex-row items-center justify-center gap-2 px-3"
            >
              <Text className="text-base">
                {paymentMethods.find(p => p.id === selectedPaymentMethodId)?.icon || "💳"}
              </Text>
              <Text className="text-base font-chakra-medium text-gray-900 flex-1 text-center" numberOfLines={1}>
                {paymentMethods.find(p => p.id === selectedPaymentMethodId)?.name || "Select"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="w-14">
            <Text className="text-gray-500 font-chakra-medium text-sm mb-2 px-1 text-center">
              Prep
            </Text>
            <TouchableOpacity
              onPress={() => setPrepared(!prepared)}
              className={`rounded-xl h-12 items-center justify-center ${prepared ? 'bg-green-100 border border-green-200' : 'bg-gray-50'}`}
            >
              <MaterialIcons name={prepared ? "check" : "close"} size={24} color={prepared ? "#10B981" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <View className="items-center mb-4">
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              style={Platform.OS === 'ios' ? { height: 120, width: "100%" } : undefined}
            />
          </View>
        )}

        {/* Amount Display */}
        <View className="items-center py-4 mb-2">
          <Text className="text-gray-500 font-chakra-medium text-sm mb-1">
            Amount
          </Text>
          <View className="flex-row items-center justify-center">
            <Text className="text-3xl font-chakra-bold text-gray-900 mr-1">
              ฿
            </Text>
            <Text
              className="text-4xl font-chakra-bold text-gray-900"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {amount}
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View className="mb-4 h-48 ">
          <ScrollView
            className="flex-1 border rounded-2xl"
            contentContainerStyle={{ padding: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-row flex-wrap gap-2 justify-start">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  className={`w-[22%] aspect-square rounded-2xl border items-center justify-center p-1 ${selectedCategoryId === cat.id
                    ? "bg-black border-black"
                    : "bg-white border-gray-100"
                    }`}
                >
                  <Text className="text-3xl mb-1">{cat.icon || "📁"}</Text>
                  <Text
                    className={`font-chakra-medium text-[10px] text-center ${selectedCategoryId === cat.id
                      ? "text-white"
                      : "text-gray-700"
                      }`}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {categories.length === 0 && (
                <Text className="text-gray-400 italic px-2 self-center w-full text-center">No categories found</Text>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Payment Methods */}


        {/* Note Input */}
        <View className="mb-4">
          <TextInput
            className="bg-gray-50 rounded-xl p-3 text-base font-chakra-medium text-gray-900"
            placeholder="Add a note..."
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Custom Keyboard & Actions */}
        {!isKeyboardVisible && (
          <View className="flex-1 justify-end gap-3">
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => handlePress("C")}
                className="flex-1 h-14 bg-gray-200 rounded-2xl items-center justify-center active:bg-gray-300"
              >
                <Text className="text-xl font-chakra-bold text-gray-800">C</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePress("DEL")}
                className="flex-1 h-14 bg-red-50 rounded-2xl items-center justify-center active:bg-red-100"
              >
                <MaterialIcons name="backspace" size={24} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveAndContinue}
                disabled={isSubmitting}
                className={`flex-1 h-14 bg-blue-50 rounded-2xl items-center justify-center active:bg-blue-100 ${isSubmitting ? 'opacity-50' : ''}`}
              >
                <MaterialIcons name="playlist-add" size={28} color="#2563EB" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSubmitting}
                className={`flex-1 h-14 bg-black rounded-2xl items-center justify-center active:scale-[0.98] ${isSubmitting ? 'opacity-50' : ''}`}
              >
                <Text className="text-white font-chakra-bold text-lg">
                  {isSubmitting ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {keys.map((key) => {
                let displayKey = key;
                if (key === "/") displayKey = "÷";
                if (key === "*") displayKey = "×";

                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handlePress(key)}
                    className="w-[22%] h-14 bg-gray-50 rounded-2xl items-center justify-center shadow-sm active:bg-gray-200"
                  >
                    <Text className="text-xl font-chakra-bold text-gray-800">
                      {displayKey}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

      </View>

      {/* Payment Picker Modal */}
      <Modal
        visible={showPaymentPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-6"
          onPress={() => setShowPaymentPicker(false)}
        >
          <View className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-xl">
            <Text className="text-lg font-chakra-bold text-gray-900 mb-4 px-2">Select Payment Method</Text>
            <ScrollView className="max-h-80">
              {paymentMethods.map((pm) => (
                <TouchableOpacity
                  key={pm.id}
                  onPress={() => {
                    setSelectedPaymentMethodId(pm.id);
                    setShowPaymentPicker(false);
                  }}
                  className={`flex-row items-center p-4 rounded-xl mb-2 ${selectedPaymentMethodId === pm.id ? 'bg-gray-100' : 'bg-white'
                    }`}
                >
                  <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${selectedPaymentMethodId === pm.id ? 'bg-white shadow-sm' : 'bg-gray-50'
                    }`}>
                    <Text className="text-xl">{pm.icon || "💳"}</Text>
                  </View>
                  <Text className={`text-base font-chakra-medium ${selectedPaymentMethodId === pm.id ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                    {pm.name}
                  </Text>
                  {selectedPaymentMethodId === pm.id && (
                    <View className="ml-auto">
                      <MaterialIcons name="check-circle" size={24} color="black" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    </BottomDrawer>
  );
}
