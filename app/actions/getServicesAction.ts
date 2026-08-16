'use server'

import { HMRC_CONFIG } from "@/config/hmrc";
import { cookies } from 'next/headers';
import { requestAppAccessToken } from './requestAppAccessToken';

export async function getServicesAction() {
  const cookieStore = await cookies();
  let token;
  if(!cookieStore.has('application_access_token')){ 
    token = await requestAppAccessToken();
    const options = {
      httpOnly: true,
      maxAge: token.expires_in,
      secure: process.env.NODE_ENV === "production"
    }
    cookieStore.set('application_access_token', token.access_token, options);
    token = token.access_token
  } else {
    token = cookieStore.get('application_access_token')?.value;
  }

  const res = await fetch(`${HMRC_CONFIG.testApiUrl}/create-test-user/services`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  try{
    const response = await res.json();
    console.log(response);
    return response
  }catch(error){
    console.error(error);
  }
}
