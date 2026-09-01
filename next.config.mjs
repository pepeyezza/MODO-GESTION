/** @type {import('next').NextConfig} */
const nextConfig = {
  // src/static/app.html is read at request time with fs.readFileSync, not imported,
  // so Next's file tracer wouldn't otherwise know to bundle it into the deployed
  // serverless function output. This makes sure it's included.
  outputFileTracingIncludes: {
    '/': ['./src/static/app.html'],
  },
};

export default nextConfig;
