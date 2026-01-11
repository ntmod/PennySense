import AsyncStorage from "@react-native-async-storage/async-storage";

export const KEYS = {
  CATEGORIES: "categories",
  PAYMENT_METHODS: "payment_methods",
  EXPENSES: "expenses",
};

export const storage = {
  get: async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error("Error reading value", e);
      return null;
    }
  },
  set: async (key: string, value: any) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (e) {
      console.error("Error saving value", e);
    }
  },
  remove: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error("Error removing value", e);
    }
  },
};
