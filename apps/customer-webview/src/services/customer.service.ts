const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

export interface Customer {
  customerId: string;
  merchantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bvn: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  hasSavedCard?: boolean;
  savedAuthorizationCode?: string;
  paystackAuthorizationCode?: string;
  cardType?: string;
  cardLast4?: string;
  cardBank?: string;
}

export interface CreateCustomerDto {
  merchantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bvn: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
}

export const customerService = {
  async getByEmail(email: string, apiKey: string): Promise<Customer | null> {
    try {
      const response = await fetch(`${API_URL}/customers/by-email/${email}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      return null;
    }
  },

  async getById(customerId: string, apiKey: string): Promise<Customer> {
    const response = await fetch(`${API_URL}/customers/${customerId}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch customer');
    }

    const result = await response.json();
    return result.data;
  },

  async create(data: CreateCustomerDto, apiKey: string): Promise<Customer> {
    const response = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer');
    }

    const result = await response.json();
    return result.data;
  },
};
