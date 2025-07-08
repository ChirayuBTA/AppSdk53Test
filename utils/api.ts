import { queryString } from "@/helper";
import { handleResponse } from "@/helper/handle-response";
import {
  authHeaders,
  formHeaders,
  imageHeaders,
} from "@/helper/request-headers";
import { apiUrl } from "@/lib/apiConfig";

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
};
