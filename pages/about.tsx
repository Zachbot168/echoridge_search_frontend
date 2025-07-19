import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function About() {
  return (
    <>
      <Head>
        <title>About - Project Echo Ridge Search</title>
        <meta name="description" content="Learn about Project Echo Ridge Search - PMF Search Engine with location mapping" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-6 py-12">
          <nav className="mb-8">
            <Link 
              href="/"
              className="text-gray-600 hover:text-black font-medium"
            >
              ← Back to Search
            </Link>
          </nav>

          <div className="max-w-4xl mx-auto">
            <header className="text-center mb-16">
              <h1 className="text-3xl font-bold text-black tracking-tight mb-4">
                About Project Echo Ridge Search
              </h1>
              <p className="text-gray-600 text-lg">
                A production-ready PMF search engine with advanced location mapping capabilities
              </p>
            </header>

            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-semibold text-black mb-4">What is Project Echo Ridge?</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Project Echo Ridge Search is a minimalist, production-ready search engine designed specifically 
                    for Product-Market Fit (PMF) analysis. It combines intelligent search capabilities with advanced 
                    geolocation features to help businesses understand market opportunities and customer insights.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Built with modern web technologies, the platform provides a clean, professional interface 
                    that scales from desktop to mobile while maintaining exceptional performance and usability.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-black mb-4">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-md p-6">
                    <h3 className="font-semibold text-black mb-2">🔍 Smart Search</h3>
                    <p className="text-gray-600 text-sm">
                      Advanced search algorithms designed for PMF analysis with real-time results and error handling.
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-md p-6">
                    <h3 className="font-semibold text-black mb-2">🗺️ Location Mapping</h3>
                    <p className="text-gray-600 text-sm">
                      Interactive map selection with customizable radius (up to 1,000km) using OpenStreetMap.
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-md p-6">
                    <h3 className="font-semibold text-black mb-2">📱 Responsive Design</h3>
                    <p className="text-gray-600 text-sm">
                      Minimalist black/white/gray design that works seamlessly across all devices and screen sizes.
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-md p-6">
                    <h3 className="font-semibold text-black mb-2">⚡ Production Ready</h3>
                    <p className="text-gray-600 text-sm">
                      Built with Next.js, TypeScript, and Tailwind CSS for enterprise-grade performance and maintainability.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-black mb-4">How to Use</h2>
                <div className="space-y-4">
                  <div className="border-l-4 border-black pl-4">
                    <h3 className="font-medium text-black mb-1">1. Search for Insights</h3>
                    <p className="text-gray-600 text-sm">
                      Enter your PMF-related query in the search bar and press Submit or Enter to find relevant market insights.
                    </p>
                  </div>
                  <div className="border-l-4 border-black pl-4">
                    <h3 className="font-medium text-black mb-1">2. Select Location (Optional)</h3>
                    <p className="text-gray-600 text-sm">
                      Click the 🗺️ "Select Location" button to open the interactive map. Click or drag the marker to choose your location.
                    </p>
                  </div>
                  <div className="border-l-4 border-black pl-4">
                    <h3 className="font-medium text-black mb-1">3. Adjust Radius</h3>
                    <p className="text-gray-600 text-sm">
                      Use the slider (up to 100km) or custom input field (up to 1,000km) to set your search radius. Quick preset buttons available.
                    </p>
                  </div>
                  <div className="border-l-4 border-black pl-4">
                    <h3 className="font-medium text-black mb-1">4. Confirm Selection</h3>
                    <p className="text-gray-600 text-sm">
                      Click "Confirm" to apply your location and radius settings. The coordinates will be displayed on the main page.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-black mb-4">Technical Details</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-black mb-2">Frontend Technologies</h3>
                      <ul className="text-gray-600 text-sm space-y-1">
                        <li>• Next.js 14 (React Framework)</li>
                        <li>• TypeScript (Type Safety)</li>
                        <li>• Tailwind CSS (Styling)</li>
                        <li>• Leaflet.js (Interactive Maps)</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-black mb-2">Map Features</h3>
                      <ul className="text-gray-600 text-sm space-y-1">
                        <li>• OpenStreetMap (No API Keys)</li>
                        <li>• Draggable Markers</li>
                        <li>• Radius Visualization</li>
                        <li>• Mobile Optimized</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-black mb-4">Backend Integration</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    The application is designed with a clean API abstraction layer that makes backend integration 
                    seamless. The current implementation uses mock data, but can be easily connected to any 
                    search API or database without requiring changes to the UI components.
                  </p>
                  <div className="bg-gray-100 border border-gray-200 rounded-md p-4">
                    <p className="text-gray-700 text-sm font-mono">
                      Replace the mock implementation in <code className="bg-white px-1 rounded">lib/api.ts</code> 
                      with your actual API endpoints to connect to real data sources.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}