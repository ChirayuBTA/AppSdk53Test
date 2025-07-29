import { queryString } from "@/helper";
import { handleResponse } from "@/helper/handle-response";
import {
  authHeaders,
  formHeaders,
  imageHeaders,
} from "@/helper/request-headers";
import { apiUrl } from "@/lib/apiConfig";
import {
  ICreateAreaBody,
  ISendManagerOTPRequestBody,
  ISendOTPRequestBody,
  ISendResendSignoffLinkBody,
  IVerifyManagerOTPRequestBody,
  IVerifyOTPRequestBody,
  IVerifyPromoBody,
} from "@/types";

export const api = {
  sendOTP: async function (body: ISendOTPRequestBody) {
    const headers = await authHeaders();

    const reqOptions = {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers: headers,
    };
    return fetch(`${apiUrl}/auth/send-otp`, reqOptions).then(handleResponse);
  },
  verifyOTP: async function (body: IVerifyOTPRequestBody) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers: headers,
    };
    return fetch(`${apiUrl}/auth/verify-otp`, reqOptions).then(handleResponse);
  },
  verifyPromo: async function (body: IVerifyPromoBody) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers: headers,
    };
    return fetch(`${apiUrl}/auth/verify-promoCode`, reqOptions).then(
      handleResponse
    );
  },
  registerUser: async function (body: FormData) {
    const headers = await formHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/auth/selfRegisterPromoter`, reqOptions).then(
      handleResponse
    );
  },
  getUserProfile: async function (query: any) {
    const headers = await authHeaders();
    return fetch(`${apiUrl}/app/getUserProfile?${queryString(query)}`, {
      headers: headers,
      cache: "no-store",
    }).then(handleResponse);
  },
  createOrderEntry: async function (body: FormData) {
    const headers = await formHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/order`, reqOptions).then(handleResponse);
  },
  uploadImages: async function (body: FormData) {
    const headers = await imageHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/app/uploadImages`, reqOptions).then(handleResponse);
  },
  loginImage: async function (body: FormData) {
    const headers = await imageHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/promoter/loginUploadImages`, reqOptions).then(
      handleResponse
    );
  },
  logoutImage: async function (body: FormData) {
    const headers = await imageHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/promoter/logoutUploadImages`, reqOptions).then(
      handleResponse
    );
  },
  getCities: async function (query: any) {
    const headers = await authHeaders();
    return fetch(`${apiUrl}/app/getAllCities?${queryString(query)}`, {
      headers: headers,
      cache: "no-store",
    }).then(handleResponse);
  },
  getSocities: async function (query: any) {
    const headers = await authHeaders();
    return fetch(
      `${apiUrl}/app/getAllActivityLocations?${queryString(query)}`,
      {
        headers: headers,
        cache: "no-store",
      }
    ).then(handleResponse);
  },
  getSocityById: async function (id: string) {
    const headers = await authHeaders();
    return fetch(`${apiUrl}/soc/${id}`, {
      headers: headers,
      cache: "no-store",
    }).then(handleResponse);
  },
  // getDashboardData: async function (socId: string, promoterId: string) {
  //   return fetch(
  //     `${apiUrl}/app/getDashboardData?activityLocId=${socId}&promoterId=${promoterId}`,
  //     {
  //       headers: authHeaders(),
  //       cache: "no-store",
  //     }
  //   ).then(handleResponse);
  // },
  getDashboardData: async function (query: any) {
    const headers = await authHeaders();
    return fetch(`${apiUrl}/app/getDashboardData?${queryString(query)}`, {
      headers: headers,
      cache: "no-store",
    }).then(handleResponse);
  },
  flagEntry: async function (body: any) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "PATCH",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/app/updateOrderFlag`, reqOptions).then(
      handleResponse
    );
  },
  getAllChannelTypes: async function (query: any) {
    const headers = await authHeaders();
    return fetch(`${apiUrl}/channelType/?${queryString(query)}`, {
      headers: headers,
      cache: "no-store",
    }).then(handleResponse);
  },
  createChannel: async function (body: FormData) {
    const headers = await formHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/channelApp/createChannel`, reqOptions).then(
      handleResponse
    );
  },
  createChannelActivity: async function (body: FormData) {
    const headers = await formHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/channelApp/createChannelActivity`, reqOptions).then(
      handleResponse
    );
  },
  addBankDetails: async function (body: FormData) {
    const headers = await formHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/channelApp/addBankDetails`, reqOptions).then(
      handleResponse
    );
  },
  getAllAreas: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(`${apiUrl}/areas?${queryString(query)}`, reqOptions).then(
      handleResponse
    );
  },
  getAllBrands: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(`${apiUrl}/brand?${queryString(query)}`, reqOptions).then(
      handleResponse
    );
  },
  getAllProjects: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(`${apiUrl}/project?${queryString(query)}`, reqOptions).then(
      handleResponse
    );
  },
  getAllActivityTypes: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(`${apiUrl}/activity?${queryString(query)}`, reqOptions).then(
      handleResponse
    );
  },
  getAllChannels: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(
      `${apiUrl}/channelApp/getAllChannels?${queryString(query)}`,
      reqOptions
    ).then(handleResponse);
  },
  getChannelBankDetailsById: async function (id: string) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(`${apiUrl}/channelApp/getBankDetails/${id}`, reqOptions).then(
      handleResponse
    );
  },
  getAllCities: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(`${apiUrl}/city?${queryString(query)}`, reqOptions).then(
      handleResponse
    );
  },
  createArea: async function (body: ICreateAreaBody) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/areas`, reqOptions).then(handleResponse);
  },
  getChannelActivityDetailsbyStatus: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(
      `${apiUrl}/channelApp/getChannelActivityDetailsbyStatus?${queryString(
        query
      )}`,
      reqOptions
    ).then(handleResponse);
  },
  getBarGraphData: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(
      `${apiUrl}/channelApp/getBarGraphData?${queryString(query)}`,
      reqOptions
    ).then(handleResponse);
  },
  getDashboardActivityDetails: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(
      `${apiUrl}/channelApp/getDashboardActivityDetails?${queryString(query)}`,
      reqOptions
    ).then(handleResponse);
  },
  cancelActivity: async function (body: any) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "PATCH",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(
      `${apiUrl}/channelApp/updateChannelActivitiesCancelled`,
      reqOptions
    ).then(handleResponse);
  },
  rescheduleActivity: async function (body: any) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "PATCH",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(
      `${apiUrl}/channelApp/updateChannelActivitiesReschedule`,
      reqOptions
    ).then(handleResponse);
  },
  resendSignoffLink: async function (body: ISendResendSignoffLinkBody) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/channelApp/reSendSignOffLink`, reqOptions).then(
      handleResponse
    );
  },
  sendManagerOTP: async function (body: ISendManagerOTPRequestBody) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/soc/send-otp`, reqOptions).then(handleResponse);
  },
  verifyManagerOTP: async function (body: IVerifyManagerOTPRequestBody) {
    const headers = await authHeaders();
    const reqOptions = {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/soc/verify-otp`, reqOptions).then(handleResponse);
  },
  getAllNatureOfExpense: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(
      `${apiUrl}/expenseApp/getNatureOfExpense?${queryString(query)}`,
      reqOptions
    ).then(handleResponse);
  },
  addExpense: async function (body: FormData) {
    const headers = await formHeaders();
    const reqOptions = {
      method: "POST",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(`${apiUrl}/expenseApp/addExpense`, reqOptions).then(
      handleResponse
    );
  },
  getExpensesByTab: async function (query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(
      `${apiUrl}/expenseApp/getExpensesByTab?${queryString(query)}`,
      reqOptions
    ).then(handleResponse);
  },
  getExpensesById: async function (id: string, query: any) {
    const headers = await authHeaders();
    const reqOptions = {
      headers,
      credentials: "include" as RequestCredentials,
      cache: "no-store" as RequestCache,
    };
    return fetch(
      `${apiUrl}/expenseApp/${id}?${queryString(query)}`,
      reqOptions
    ).then(handleResponse);
  },
  updateCorrectedExpenseForm: async function (body: FormData) {
    const headers = await formHeaders();
    const reqOptions = {
      method: "PATCH",
      body,
      credentials: "include" as RequestCredentials,
      headers,
    };
    return fetch(
      `${apiUrl}/expenseApp/updateCorrectedExpenseForm`,
      reqOptions
    ).then(handleResponse);
  },
};
