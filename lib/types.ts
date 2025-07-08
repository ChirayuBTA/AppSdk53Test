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
}
