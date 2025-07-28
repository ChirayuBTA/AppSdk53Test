interface ISendOTPRequestBody {
  phone: string;
}

interface IVerifyOTPRequestBody extends ISendOTPRequestBody {
  otp: string;
}
interface IVerifyPromoBody {
  phone: string;
  promoCode: string;
  promoterId: string;
  userId: string;
}
interface ICreateAreaBody {
  name: string;
  cityId: string;
}
interface ISendManagerOTPRequestBody {
  phone: string;
  id: string;
}

interface IVerifyManagerOTPRequestBody extends ISendManagerOTPRequestBody {
  otp: string;
}

interface ISendResendSignoffLinkBody {
  activityId: string;
  phone: string;
}
