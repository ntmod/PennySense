import AddTransactionModal from "@/components/AddTransactionModal";
import { Category, Expense, PaymentMethod } from "@/types";
import { normalizeNotionCategoryList, normalizeNotionExpenseList, normalizeNotionPaymentMethodList } from "@/utils/notion";
import { KEYS, storage } from "@/utils/storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
export default function Home() {

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    const loadCachedData = async () => {
      const cachedCategories = await storage.get(KEYS.CATEGORIES);
      if (cachedCategories) {
        console.log('found cached categories:', cachedCategories)
        setCategories(cachedCategories);
      }
      const cachedPaymentMethods = await storage.get(KEYS.PAYMENT_METHODS);
      if (cachedPaymentMethods) {
        console.log('found cached payment methods:', cachedPaymentMethods)
        setPaymentMethods(cachedPaymentMethods);
      }
      const cachedExpenses = await storage.get(KEYS.EXPENSES);
      if (cachedExpenses) {
        console.log('found cached expenses:', cachedExpenses)
        setRecentExpenses(cachedExpenses);
      }
    };
    loadCachedData();
    getCategoryData();
    getPaymentMethods();
    getHomeExpenses();
  }, []);

  const NOTION_TOKEN = process.env.EXPO_PUBLIC_NOTION_TOKEN || '';
  const DB_CATEGORY_ID = process.env.EXPO_PUBLIC_DB_CATEGORY_ID || '';
  const DB_PAYMENT_METHOD_ID = process.env.EXPO_PUBLIC_DB_PAYMENT_METHOD_ID || '';
  const DB_EXPENSES_ID = process.env.EXPO_PUBLIC_DB_EXPENSES_ID || '';
  const getCategoryData = async () => {
    if (NOTION_TOKEN === '' || DB_CATEGORY_ID === '') {
      console.error('NOTION_TOKEN or DB_CATEGORY_ID is not set');
      return;
    }
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${DB_CATEGORY_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28', // Requirement for Notion API
        },
      });

      const data = await response.json();
      const normalizedData = normalizeNotionCategoryList(data.results);
      setCategories(normalizedData);
      await storage.set(KEYS.CATEGORIES, normalizedData);
    } catch (error) {
      console.error("Error fetching Notion data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getPaymentMethods = async () => {
    if (NOTION_TOKEN === '' || DB_PAYMENT_METHOD_ID === '') {
      console.error('NOTION_TOKEN or DB_PAYMENT_METHOD_ID is not set');
      return;
    }
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${DB_PAYMENT_METHOD_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28', // Requirement for Notion API
        },
      });

      const data = await response.json();
      console.log(JSON.stringify(data))
      const normalizedData = normalizeNotionPaymentMethodList(data.results);
      console.log(normalizedData)
      setPaymentMethods(normalizedData);
      await storage.set(KEYS.PAYMENT_METHODS, normalizedData);
    } catch (error) {
      console.error("Error fetching Notion data:", error);
    } finally {
      setLoading(false);
    }
  }
  const getHomeExpenses = async () => {
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
      console.log(JSON.stringify(data));
      const normalized = normalizeNotionExpenseList(data.results);
      normalized.sort((a, b) => new Date(b.lastEditedTime).getTime() - new Date(a.lastEditedTime).getTime());
      console.log(normalized);
      setRecentExpenses(normalized);

      setTotalSpent(normalized.reduce((acc, expense) => acc + expense.amount, 0));
      await storage.set(KEYS.EXPENSES, normalized);
    } catch (e) {
      console.error(e);
    }
  };
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getCategoryData();
    await getPaymentMethods();
    await getHomeExpenses();
    setRefreshing(false);
  }, []);

  const colorScheme = useColorScheme();


  return (
    <View className="flex-1 h-full" >
      <View id="nav-area" className={`h-10 ${colorScheme === 'dark' ? 'bg-black' : 'bg-white'}`}></View>
      <View className="flex-1 h-full bg-background" >
        {/* Header Section */}
        <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
          {/* Greeting Section */}
          <View className="flex-1">
            <Text className="text-gray-500 text-sm font-chakra-medium">Good Morning,</Text>
            <Text className="text-2xl font-chakra-bold text-primary ">Michii</Text>
          </View>

          {/* Right Actions */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="p-2 bg-gray-100 rounded-full">
              <MaterialIcons name="notifications-none" size={24} color="#374151" />
            </TouchableOpacity>

            {/* <TouchableOpacity>
              <Image
                source="https://i.pravatar.cc/150?img=68"
                style={{ width: 40, height: 40, borderRadius: 20 }}
                className="border-2 border-white"
                contentFit="cover"
                transition={1000}
              />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Content Area */}
        <ScrollView
          className="flex-1 py-4 w-full h-full"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
          }
        >
          <View id="total-spent" className="mx-6 py-2">
            <Text className="text-lg font-chakra-semibold text-gray-800 mb-4 ">This month</Text>
            <View className="h-40 bg-white rounded-2xl shadow-lg p-6 justify-center items-center gap-4">
              <Text className="text-black text-xl font-chakra-medium">Total Spent</Text>
              <Text className="text-black text-5xl font-chakra-bold">{(totalSpent || 0).toFixed(2)} THB</Text>
            </View>
          </View>
          <View id='payment-methods' className="py-2">
            <Text className="mx-6 text-lg font-chakra-semibold text-gray-800 mb-4">Source</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            >
              {paymentMethods.map((pm) => {
                const pmExpenses = recentExpenses.filter(e => e.paymentMethodId === pm.id);
                const total = pmExpenses.reduce((sum, e) => sum + e.amount, 0);
                const count = pmExpenses.length;

                return (
                  <View key={pm.id} className="w-32 h-44 bg-white rounded-2xl p-3 justify-between shadow-sm border border-gray-100">
                    <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
                      <Text className="text-xl">{pm.icon || "💳"}</Text>
                    </View>
                    <View>
                      <Text className="text-gray-500 text-xs font-chakra-medium mb-1" numberOfLines={1}>{pm.name}</Text>
                      <Text className="text-base font-chakra-bold text-gray-900" numberOfLines={1}>
                        {total.toLocaleString(undefined, { maximumFractionDigits: 0 })} THB
                      </Text>
                      <Text className="text-[10px] font-chakra-medium text-gray-400 mt-1">{count} Trans</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
          <View className="py-2 mx-6 items-center">
            <Text className="text-lg font-chakra-semibold text-gray-800 mb-6 w-full text-left">Analytics</Text>
            {recentExpenses.length > 0 ? (() => {
              // Calculate chart data
              const categoryTotals: { [key: string]: number } = {};
              recentExpenses.filter(e => e.type === 'expense').forEach(expense => {
                // If categoryId is missing or not found, group under 'Uncategorized'
                // But better to use the category ID for grouping to be precise, then look up name
                const catId = expense.categoryId;
                const catName = categories.find(c => c.id === catId)?.name || "Uncategorized";

                if (!categoryTotals[catName]) {
                  categoryTotals[catName] = 0;
                }
                categoryTotals[catName] += expense.amount;
              });

              const CHART_COLORS = ['#F97316', '#EC4899', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#6366F1', '#EF4444'];

              const pieData = Object.keys(categoryTotals).map((catName, index) => ({
                value: categoryTotals[catName],
                color: CHART_COLORS[index % CHART_COLORS.length],
                text: `${Math.round((categoryTotals[catName] / (totalSpent || 1)) * 100)}%`,
                categoryName: catName
              })).sort((a, b) => b.value - a.value);

              return (
                <View className="flex-row items-center justify-between bg-white p-6 rounded-3xl shadow-sm w-full">
                  <PieChart
                    data={pieData}
                    donut
                    textColor="white"
                    radius={80}
                    innerRadius={60}
                    textSize={10}
                    showTextBackground={false}
                    centerLabelComponent={() => {
                      return (
                        <View className="items-center justify-center">
                          <Text className="text-gray-400 text-xs font-chakra-medium">Total</Text>
                          <Text className="text-sm font-chakra-bold text-gray-900">
                            {(totalSpent || 0).toLocaleString(undefined, { maximumFractionDigits: 0, notation: "standard" })} THB
                          </Text>
                        </View>
                      );
                    }}
                  />
                  {/* Legend */}
                  <ScrollView
                    className="flex-1 ml-6 h-40"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    <View className="gap-4 py-2">
                      {pieData.map((item, index) => (
                        <View key={index} className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2 flex-1 mr-2">
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
                            <Text className="text-gray-600 text-xs font-chakra-medium" numberOfLines={1}>{item.categoryName}</Text>
                          </View>
                          <Text className="text-gray-900 text-xs font-chakra-semibold">
                            {item.value.toLocaleString()} THB
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              );
            })() : (
              <View className="bg-white p-6 rounded-3xl shadow-sm w-full items-center justify-center h-48">
                <Text className="text-gray-400 font-chakra-medium">No expense data</Text>
              </View>
            )}
          </View>
          <View className="mx-6 py-2 mb-20">
            <Text className="text-lg font-chakra-semibold text-gray-800 mb-4">Recent Transactions</Text>
            <View>
              <View className="bg-white rounded-3xl shadow-sm h-fit">
                {recentExpenses.length > 0 ? (
                  recentExpenses.slice(0, 5).map((expense, index) => {
                    const category = categories.find(c => c.id === expense.categoryId);
                    const isLast = index === Math.min(recentExpenses.length, 5) - 1;

                    return (
                      <View
                        key={expense.id}
                        className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
                      >
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                            <Text className="text-xl">{category?.icon || '🧾'}</Text>
                          </View>
                          <View>
                            <Text className="text-gray-900 font-chakra-medium">{expense.note}</Text>
                            <Text className="text-gray-500 text-xs font-chakra-medium">{category?.name || "Uncategorized"}</Text>
                            <Text className="text-gray-400 text-xs font-chakra-medium">
                              {new Date(expense.date).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <Text className={`font-chakra-bold ${expense.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                          {expense.type === 'income' ? '+' : '-'}{expense.amount.toLocaleString()} THB
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <View className="p-6 items-center">
                    <Text className="text-gray-400 font-chakra-medium">No recent transactions</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

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

        {/* Bottom Drawer Modal */}
        <AddTransactionModal
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          categories={categories}
          paymentMethods={paymentMethods}
        />
      </View>
    </View>

  );
}

