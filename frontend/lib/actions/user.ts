import client from "./client";

export async function getUserByWallet(walletAddress: string) {
  try {
    const response = await client("/api/auth/me-by-wallet", {
      method: "GET",
      formData: {
        walletAddress,
      },
    });
    console.log(response);
    if (response.error) {
      return null;
    }
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}
