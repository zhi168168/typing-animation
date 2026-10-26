import handler from "../accounts/vercel.mjs";

export default function billing(req, res) {
  const url = new URL(req.url, "https://typing-animation.com");
  const route = url.searchParams.get("__billingPath") || "";
  if (!/^[a-z/-]*$/.test(route)) {
    res.statusCode = 400;
    return res.end("Invalid billing route");
  }
  url.searchParams.delete("__billingPath");
  req.url = `/api/billing/${route}${url.search}`;
  return handler(req, res);
}
