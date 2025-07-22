export interface ISendOTPRequestBody {
  phone: string;
}

export interface IVerifyOTPRequestBody extends ISendOTPRequestBody {
  otp: string;
}
export interface IVerifyPromoBody {
  phone: string;
  promoCode: string;
  promoterId: string;
  userId: string;
}
export interface ICreateAreaBody {
  name: string;
  cityId: string;
}
export interface ISendManagerOTPRequestBody {
  phone: string;
  id: string;
}

export interface IVerifyManagerOTPRequestBody
  extends ISendManagerOTPRequestBody {
  otp: string;
}

export interface ISendResendSignoffLinkBody {
  activityId: string;
  phone: string;
}
