import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">CRL Pay</h1>
          <p className="text-gray-600">Buy Now, Pay Later</p>
        </div>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="font-semibold mb-2">Product Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Product:</span>
              <span className="font-medium">iPhone 13 Pro</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium">₦450,000</span>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Payment Options</h2>
            <div className="space-y-2 text-sm">
              <div className="p-3 border rounded hover:border-blue-500 cursor-pointer">
                <div className="flex justify-between">
                  <span>3 months</span>
                  <span className="font-medium">₦155,250/month</span>
                </div>
                <span className="text-xs text-gray-500">2.5% monthly interest</span>
              </div>
              <div className="p-3 border rounded hover:border-blue-500 cursor-pointer">
                <div className="flex justify-between">
                  <span>6 months</span>
                  <span className="font-medium">₦79,500/month</span>
                </div>
                <span className="text-xs text-gray-500">2.0% monthly interest</span>
              </div>
            </div>
          </div>

          <Link
            href="/checkout"
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Continue to Checkout
          </Link>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          Powered by CRL Pay - Buy Now, Pay Later
        </p>
      </div>
    </div>
  );
}
