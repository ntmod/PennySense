export const normalizeNotionCategoryList = (items: any[]) => {
  return items.map((item: any) => {
    return {
      id: item.id,
      name: item.properties.Name.title[0].plain_text,
      icon: item.icon?.emoji,
    };
  });
};

export const normalizeNotionPaymentMethodList = (items: any[]) => {
  return items.map((item: any) => {
    return {
      id: item.id,
      name: item.properties.Name.title[0].plain_text,
      icon: item.icon?.emoji,
    };
  });
};

export const normalizeNotionExpenseList = (items: any[]) => {
  return items.map((item: any) => {
    return {
      id: item.id,
      amount: item.properties.Amount?.number || 0,
      date: item.properties.Date?.date?.start || new Date().toISOString(),
      note: item.properties.Expense?.title[0]?.plain_text || "Untitled",
      categoryId: item.properties.Category?.relation?.[0]?.id,
      paymentMethodId: item.properties.Payment?.relation?.[0]?.id,
      prepared: item.properties.Prepared?.select?.name?.toLowerCase() || "no",
      type: item.properties.Type?.select?.name?.toLowerCase() || "expense",
      createdTime: item.created_time,
      lastEditedTime: item.last_edited_time,
    };
  });
};

export const createNotionTransaction = async (
  amount: number,
  note: string,
  categoryId: string,
  paymentMethodId: string,
  date: Date,
  prepared: boolean = false
) => {
  const NOTION_TOKEN = process.env.EXPO_PUBLIC_NOTION_TOKEN;
  const DB_EXPENSES_ID = process.env.EXPO_PUBLIC_DB_EXPENSES_ID;

  if (!NOTION_TOKEN || !DB_EXPENSES_ID) {
    throw new Error("Missing Notion configuration");
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: DB_EXPENSES_ID },
      properties: {
        Expense: {
          title: [
            {
              text: {
                content: note || "Untitled",
              },
            },
          ],
        },
        Amount: {
          number: amount,
        },
        Date: {
          date: {
            start: date.toISOString().split("T")[0], // YYYY-MM-DD
          },
        },
        Category: categoryId
          ? {
              relation: [
                {
                  id: categoryId,
                },
              ],
            }
          : undefined,
        Payment: paymentMethodId
          ? {
              relation: [
                {
                  id: paymentMethodId,
                },
              ],
            }
          : undefined,
        Prepared: {
          select: {
            name: prepared ? "Yes" : "No",
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create transaction: ${errorBody}`);
  }

  return await response.json();
};

export const deleteNotionTransaction = async (pageId: string) => {
  const NOTION_TOKEN = process.env.EXPO_PUBLIC_NOTION_TOKEN;

  if (!NOTION_TOKEN) {
    throw new Error("Missing Notion configuration");
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      archived: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to delete transaction: ${errorBody}`);
  }

  return await response.json();
};

export const updateNotionTransaction = async (
  pageId: string,
  amount: number,
  note: string,
  categoryId: string,
  paymentMethodId: string,
  date: Date,
  prepared: boolean = false
) => {
  const NOTION_TOKEN = process.env.EXPO_PUBLIC_NOTION_TOKEN;

  if (!NOTION_TOKEN) {
    throw new Error("Missing Notion configuration");
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      properties: {
        Expense: {
          title: [
            {
              text: {
                content: note || "Untitled",
              },
            },
          ],
        },
        Amount: {
          number: amount,
        },
        Date: {
          date: {
            start: date.toISOString().split("T")[0], // YYYY-MM-DD
          },
        },
        Category: categoryId
          ? {
              relation: [
                {
                  id: categoryId,
                },
              ],
            }
          : undefined,
        Payment: paymentMethodId
          ? {
              relation: [
                {
                  id: paymentMethodId,
                },
              ],
            }
          : undefined,
        Prepared: {
          select: {
            name: prepared ? "Yes" : "No",
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update transaction: ${errorBody}`);
  }

  return await response.json();
};
