import AddTransactionModal from "@/components/AddTransactionModal";
import { Category, Expense, PaymentMethod } from "@/types";
import { deleteNotionTransaction, normalizeNotionExpenseList } from "@/utils/notion";
import { KEYS, storage } from "@/utils/storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, SectionList, Text, TouchableOpacity, TouchableWithoutFeedback, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Expenses() {
  const colorScheme = useColorScheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [displayedExpenses, setDisplayedExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter States
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | 'custom'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Custom Range State
  /* Custom Range State */
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: Date, end: Date }>({
    start: new Date(),
    end: new Date()
  });
  const [tempRange, setTempRange] = useState<{ start: Date, end: Date }>({
    start: new Date(),
    end: new Date()
  });

  // Picker State for Android (Dialog) and iOS (Active Field)
  const [pickerParam, setPickerParam] = useState<{ show: boolean, mode: 'start' | 'end' | null }>({
    show: false,
    mode: null
  });



  const NOTION_TOKEN = process.env.EXPO_PUBLIC_NOTION_TOKEN || '';
  const DB_EXPENSES_ID = process.env.EXPO_PUBLIC_DB_EXPENSES_ID || '';

  const getExpenses = async () => {
    if (NOTION_TOKEN === '' || DB_EXPENSES_ID === '') return;
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${DB_EXPENSES_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          sorts: [
            {
              property: "Date",
              direction: "descending"
            }
          ]
        })
      });
      const data = await response.json();
      const normalized = normalizeNotionExpenseList(data.results);
      normalized.sort((a, b) => new Date(b.lastEditedTime).getTime() - new Date(a.lastEditedTime).getTime());
      setExpenses(normalized);
      await storage.set(KEYS.EXPENSES, normalized);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    const cachedExpenses = await storage.get(KEYS.EXPENSES);
    if (cachedExpenses) setExpenses(cachedExpenses);

    const cachedCategories = await storage.get(KEYS.CATEGORIES);
    if (cachedCategories) setCategories(cachedCategories);

    const cachedPaymentMethods = await storage.get(KEYS.PAYMENT_METHODS);
    if (cachedPaymentMethods) setPaymentMethods(cachedPaymentMethods);

    await getExpenses();
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let filtered = [...expenses];

    // Date Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        const itemMonth = itemDate.getMonth();
        const itemYear = itemDate.getFullYear();

        if (dateFilter === 'this_month') {
          return itemMonth === currentMonth && itemYear === currentYear;
        } else if (dateFilter === 'last_month') {
          // Handle January correctly for last month
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return itemMonth === lastMonth && itemYear === lastMonthYear;
        } else if (dateFilter === 'custom') {
          const start = new Date(customRange.start);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customRange.end);
          end.setHours(23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        }
        return true;
      });
      console.log(filtered);
    }

    // Type Filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    setDisplayedExpenses(filtered);
  }, [expenses, dateFilter, customRange, typeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getExpenses();
    setRefreshing(false);
  }, []);

  const groupExpenses = (items: Expense[]) => {
    const groups: { [key: string]: Expense[] } = {};

    items.forEach(expense => {
      const date = new Date(expense.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

      if (date.toDateString() === today.toDateString()) {
        key = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Yesterday";
      }

      if (!groups[key]) {
        groups[key] = [];
      }

      const cat = categories.find(c => c.id === expense.categoryId);
      const payment = paymentMethods.find(p => p.id === expense.paymentMethodId);
      groups[key].push({
        ...expense,
        categoryName: cat?.name || "Uncategorized",
        categoryIcon: cat?.icon,
        paymentMethodName: payment?.name || "Cash",
        paymentMethodIcon: payment?.icon
      });
    });

    return Object.keys(groups).map(key => ({
      title: key,
      data: groups[key]
    }));
  };

  const sections = groupExpenses(displayedExpenses);
  const deleteExpense = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this transaction?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            await deleteExpenseById(id);
            await getExpenses();
            setIsDeleting(false);
          }
        }
      ]
    );
  };

  const deleteExpenseById = async (id: string) => {
    try {
      await deleteNotionTransaction(id);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to delete transaction");
    }
  };
  return (
    <View className="flex-1 h-full">
      <View id="nav-area" className={`h-10 ${colorScheme === 'dark' ? 'bg-black' : 'bg-white'}`}></View>
      <SafeAreaView className="flex-1 bg-background" edges={['left', 'right', 'bottom']}>
        {/* Header */}
        <View className="px-6 py-4 bg-white border-b border-gray-100 shadow-sm z-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-chakra-bold text-primary">Expenses</Text>
          </View>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
            contentContainerStyle={{ paddingRight: 24 }}
          >
            <TouchableOpacity
              onPress={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-full mr-2 border ${dateFilter === 'all'
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-chakra-medium text-xs ${dateFilter === 'all' ? 'text-white' : 'text-gray-600'
                }`}>
                All Time
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDateFilter('this_month')}
              className={`px-4 py-2 rounded-full mr-2 border ${dateFilter === 'this_month'
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-chakra-medium text-xs ${dateFilter === 'this_month' ? 'text-white' : 'text-gray-600'
                }`}>
                This Month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDateFilter('last_month')}
              className={`px-4 py-2 rounded-full mr-2 border ${dateFilter === 'last_month'
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-chakra-medium text-xs ${dateFilter === 'last_month' ? 'text-white' : 'text-gray-600'
                }`}>
                Last Month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowRangeModal(true);
                // Initialize temp range with current custom range or defaults
                // setTempRange(dateFilter === 'custom' ? customRange : { start: new Date(), end: new Date() });
              }}
              className={`px-4 py-2 rounded-full mr-2 border ${dateFilter === 'custom'
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-chakra-medium text-xs ${dateFilter === 'custom' ? 'text-white' : 'text-gray-600'
                }`}>
                {dateFilter === 'custom'
                  ? `${customRange.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${customRange.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : 'Custom Range'}
              </Text>
            </TouchableOpacity>

            <View className="w-px h-6 bg-gray-200 mx-2 self-center" />

            <TouchableOpacity
              onPress={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-full mr-2 border ${typeFilter === 'all'
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-chakra-medium text-xs ${typeFilter === 'all' ? 'text-white' : 'text-gray-600'
                }`}>
                All Types
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTypeFilter('income')}
              className={`px-4 py-2 rounded-full mr-2 border ${typeFilter === 'income'
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-chakra-medium text-xs ${typeFilter === 'income' ? 'text-white' : 'text-gray-600'
                }`}>
                Income
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTypeFilter('expense')}
              className={`px-4 py-2 rounded-full mr-2 border ${typeFilter === 'expense'
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-chakra-medium text-xs ${typeFilter === 'expense' ? 'text-white' : 'text-gray-600'
                }`}>
                Expense
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-400 font-chakra-medium text-lg">No expenses record</Text>
            </View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-6 py-3 mt-2">
              <Text className="text-gray-500 font-chakra-bold text-sm uppercase tracking-wider">{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="px-6 py-2">
              <View className="flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                <View className="flex-row items-center gap-4">
                  <View className={`w-12 h-12 rounded-full items-center justify-center bg-gray-100`}>
                    <Text className="text-2xl">{(item as any).categoryIcon || '🧾'}</Text>
                  </View>
                  <View>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-gray-900 font-chakra-semibold text-base">{item.note}</Text>
                      {item.prepared === 'yes' && (
                        <MaterialIcons name="check-circle" size={16} color="#10B981" />
                      )}
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-gray-400 text-xs font-chakra-medium">{item.categoryName}</Text>
                      <Text className="text-gray-300 text-[10px]">•</Text>
                      <Text className="text-gray-400 text-xs font-chakra-medium">
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      {item.paymentMethodIcon && <Text className="text-[10px]">{item.paymentMethodIcon}</Text>}
                      <Text className="text-gray-400 text-[10px] font-chakra-medium">{item.paymentMethodName}</Text>
                    </View>
                  </View>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className={`font-chakra-bold text-base ${item.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString()} THB
                  </Text>
                  <TouchableOpacity
                    className="p-1 -mr-2"
                    onPress={() => setSelectedExpense(item)}
                  >
                    <MaterialIcons name="more-vert" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-16 h-16 bg-white rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.30,
            shadowRadius: 4.65,
            elevation: 8,
          }}
          activeOpacity={0.8}
          onPress={() => setDrawerVisible(true)}
        >
          <MaterialIcons name="add" size={32} color="black" />
        </TouchableOpacity>

        {/* Add Transaction Modal */}
        <AddTransactionModal
          visible={drawerVisible}
          onClose={() => {
            setDrawerVisible(false);
            setEditingExpense(null);
            // Refresh list if desired, or we rely on the modal saving and subsequent manual refresh
            // But ideally, we should refresh here if something changed. 
            // Since onSave/etc triggers internal logic, we might need a callback or just auto-refresh.
            // For now, let's just trigger a refresh
            onRefresh();
          }}
          categories={categories}
          paymentMethods={paymentMethods}
          initialData={editingExpense}
        />

        {/* Edit/Delete Menu Modal */}
        <Modal
          id="edit-delete-menu"
          visible={!!selectedExpense && !isDeleting}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedExpense(null)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/50 justify-end"
            activeOpacity={1}
            onPress={() => setSelectedExpense(null)}
          >
            <TouchableWithoutFeedback>
              <View className="bg-white px-6 py-8 rounded-t-3xl shadow-2xl">
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-lg font-chakra-bold text-gray-900">
                    Transaction Options
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedExpense(null)}>
                    <MaterialIcons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  className="flex-row items-center p-3 mb-3 bg-gray-50 rounded-xl"
                  onPress={() => {
                    if (selectedExpense) {
                      setEditingExpense(selectedExpense);
                      setSelectedExpense(null);
                      setDrawerVisible(true);
                    }
                  }}
                >
                  <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 shadow-sm">
                    <MaterialIcons name="edit" size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-base font-chakra-medium text-gray-800">Edit Transaction</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center p-3 bg-red-50 rounded-xl"
                  onPress={() => {
                    if (selectedExpense) {
                      const id = selectedExpense.id;
                      setSelectedExpense(null);
                      setTimeout(() => {
                        deleteExpense(id);
                      }, 100);
                    }
                  }}
                >
                  <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 shadow-sm">
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                  </View>
                  <Text className="text-base font-chakra-medium text-red-500">Delete Transaction</Text>
                </TouchableOpacity>

                <View className="h-8" />
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>

      {/* Loading Overlay */}
      <Modal
        visible={isDeleting}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white p-6 rounded-2xl items-center shadow-xl">
            <ActivityIndicator size="large" color="#000" />
            <Text className="mt-4 text-gray-800 font-chakra-medium">Deleting...</Text>
          </View>
        </View>
      </Modal>

      {/* Custom Range Picker Modal */}
      <Modal
        visible={showRangeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRangeModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-xl">
            <Text className="text-xl font-chakra-bold text-gray-900 mb-6 text-center">Select Date Range</Text>

            <View className="gap-4">
              <View>
                <Text className="text-sm font-chakra-medium text-gray-500 mb-2">Start Date</Text>
                <TouchableOpacity
                  className="bg-gray-50 p-3 rounded-xl border border-gray-100"
                  onPress={() => setPickerParam({ show: !pickerParam.show || pickerParam.mode !== 'start', mode: 'start' })}
                >
                  <Text className="text-base font-chakra-medium text-gray-900">
                    {tempRange.start.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {Platform.OS === 'ios' && pickerParam.show && pickerParam.mode === 'start' && (
                  <DateTimePicker
                    value={tempRange.start}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      const currentDate = selectedDate || tempRange.start;
                      setTempRange({ ...tempRange, start: currentDate });
                    }}
                    textColor="black"
                    style={{ height: 120, marginTop: 10 }}
                  />
                )}
              </View>

              <View>
                <Text className="text-sm font-chakra-medium text-gray-500 mb-2">End Date</Text>
                <TouchableOpacity
                  className="bg-gray-50 p-3 rounded-xl border border-gray-100"
                  onPress={() => setPickerParam({ show: !pickerParam.show || pickerParam.mode !== 'end', mode: 'end' })}
                >
                  <Text className="text-base font-chakra-medium text-gray-900">
                    {tempRange.end.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {Platform.OS === 'ios' && pickerParam.show && pickerParam.mode === 'end' && (
                  <DateTimePicker
                    value={tempRange.end}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      const currentDate = selectedDate || tempRange.end;
                      setTempRange({ ...tempRange, end: currentDate });
                    }}
                    textColor="black"
                    style={{ height: 120, marginTop: 10 }}
                  />
                )}
              </View>
            </View>

            <View className="flex-row gap-3 mt-8">
              <TouchableOpacity
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
                onPress={() => setShowRangeModal(false)}
              >
                <Text className="font-chakra-bold text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 bg-primary rounded-xl items-center"
                onPress={() => {
                  setCustomRange(tempRange);
                  setDateFilter('custom');
                  setShowRangeModal(false);
                }}
              >
                <Text className="font-chakra-bold text-white">Apply Range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Android Date Picker */}
        {Platform.OS === 'android' && pickerParam.show && pickerParam.mode && (
          <DateTimePicker
            testID="dateTimePicker"
            value={pickerParam.mode === 'start' ? tempRange.start : tempRange.end}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={(event, selectedDate) => {
              setPickerParam(prev => ({ ...prev, show: false }));
              if (event.type === 'set' && selectedDate && pickerParam.mode) {
                setTempRange(prev => ({ ...prev, [pickerParam.mode!]: selectedDate }));
              }
            }}
          />
        )}
      </Modal>
    </View>
  );
}
