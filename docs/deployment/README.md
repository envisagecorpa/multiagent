# Deployment Guide

This guide covers different deployment strategies for the Photo Album application.

## Prerequisites

- Node.js 18+
- npm 9+
- Git
- Production build environment

## Build Configuration

### Environment Variables

Create environment-specific `.env` files:

#### `.env.production`
```env
VITE_APP_NAME="Photo Album"
VITE_APP_VERSION="1.0.0"
VITE_API_BASE_URL="https://api.photoalbum.app"
VITE_DB_NAME="photo_album_prod"
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_CACHE_MAX_SIZE=104857600
VITE_IMAGE_CACHE_MAX_SIZE=209715200
VITE_DEBUG=false
VITE_LOG_LEVEL="error"
```

#### `.env.staging`
```env
VITE_APP_NAME="Photo Album (Staging)"
VITE_APP_VERSION="1.0.0-staging"
VITE_API_BASE_URL="https://staging-api.photoalbum.app"
VITE_DB_NAME="photo_album_staging"
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_DEBUG=true
VITE_LOG_LEVEL="debug"
```

### Build Commands

```bash
# Development build
npm run build

# Production build with environment
NODE_ENV=production npm run build

# Staging build
NODE_ENV=staging npm run build

# Analyze bundle size
npm run build:analyze
```

## Deployment Options

### 1. Static Hosting (Recommended)

#### Netlify

1. **Connect Repository**
   ```bash
   # In Netlify dashboard
   # Connect your Git repository
   # Set build command: npm run build
   # Set publish directory: dist
   ```

2. **Configure Build Settings**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = "dist"
     
   [build.environment]
     NODE_VERSION = "18"
     NPM_VERSION = "9"
     
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-XSS-Protection = "1; mode=block"
       X-Content-Type-Options = "nosniff"
       
   [[headers]]
     for = "*.wasm"
     [headers.values]
       Content-Type = "application/wasm"
       
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Deploy**
   ```bash
   # Automatic deployment on git push
   git push origin main
   
   # Manual deployment
   netlify deploy --prod --dir=dist
   ```

#### Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure Deployment**
   ```json
   // vercel.json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           },
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           }
         ]
       },
       {
         "source": "/**/*.wasm",
         "headers": [
           {
             "key": "Content-Type",
             "value": "application/wasm"
           }
         ]
       }
     ]
   }
   ```

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   
   # Deploy to preview
   vercel
   ```

#### GitHub Pages

1. **Configure GitHub Actions**
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout
         uses: actions/checkout@v4
         
       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
           node-version: '18'
           cache: 'npm'
           
       - name: Install dependencies
         run: npm ci
         
       - name: Build
         run: npm run build
         env:
           NODE_ENV: production
           
       - name: Deploy to GitHub Pages
         uses: peaceiris/actions-gh-pages@v3
         if: github.ref == 'refs/heads/main'
         with:
           github_token: ${{ secrets.GITHUB_TOKEN }}
           publish_dir: ./dist
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings > Pages
   - Select "Deploy from a branch"
   - Choose "gh-pages" branch

### 2. Cloud Hosting

#### AWS S3 + CloudFront

1. **Create S3 Bucket**
   ```bash
   # AWS CLI commands
   aws s3 mb s3://photoalbum-app-prod
   aws s3 website s3://photoalbum-app-prod --index-document index.html --error-document index.html
   ```

2. **Upload Build**
   ```bash
   # Build and upload
   npm run build
   aws s3 sync dist/ s3://photoalbum-app-prod --delete
   ```

3. **Configure CloudFront**
   ```json
   {
     "DistributionConfig": {
       "CallerReference": "photoalbum-app-prod",
       "Comment": "Photo Album App Production",
       "DefaultCacheBehavior": {
         "TargetOriginId": "S3-photoalbum-app-prod",
         "ViewerProtocolPolicy": "redirect-to-https",
         "Compress": true,
         "CachePolicyId": "managed-caching-optimized"
       },
       "Origins": [
         {
           "Id": "S3-photoalbum-app-prod",
           "DomainName": "photoalbum-app-prod.s3.amazonaws.com",
           "S3OriginConfig": {
             "OriginAccessIdentity": ""
           }
         }
       ],
       "Enabled": true,
       "HttpVersion": "http2",
       "IsIPV6Enabled": true,
       "PriceClass": "PriceClass_100"
     }
   }
   ```

#### Google Cloud Storage + CDN

1. **Create Bucket**
   ```bash
   gsutil mb gs://photoalbum-app-prod
   gsutil web set -m index.html -e index.html gs://photoalbum-app-prod
   ```

2. **Deploy**
   ```bash
   npm run build
   gsutil -m rsync -r -d dist/ gs://photoalbum-app-prod
   ```

### 3. Docker Deployment

#### Dockerfile
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # WASM MIME type
    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
    }

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|wasm)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy (if needed)
        location /api/ {
            proxy_pass http://api-server:3000/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    
  # Optional: Add monitoring
  monitoring:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

#### Deploy with Docker
```bash
# Build and run
docker build -t photoalbum-app .
docker run -d -p 80:80 --name photoalbum-app photoalbum-app

# Or use Docker Compose
docker-compose up -d
```

### 4. Serverless Deployment

#### Netlify Functions (Optional API)
```javascript
// netlify/functions/api.js
exports.handler = async (event, context) => {
  const { httpMethod, path, body } = event;
  
  // Handle API requests
  if (httpMethod === 'POST' && path === '/api/analytics') {
    // Process analytics data
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  }
  
  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' })
  };
};
```

## Performance Optimization

### Build Optimizations

1. **Bundle Analysis**
   ```bash
   npm run build:analyze
   # Open bundle analyzer report
   ```

2. **Code Splitting**
   ```javascript
   // Dynamic imports for route-based splitting
   const PhotoGrid = () => import('./components/PhotoGrid.js');
   const Settings = () => import('./components/Settings.js');
   ```

3. **Asset Optimization**
   ```javascript
   // vite.config.js optimizations
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['sql.js'],
             ui: ['./src/components/**'],
             utils: ['./src/utils/**']
           }
         }
       }
     }
   });
   ```

### CDN Configuration

1. **Asset Distribution**
   ```html
   <!-- Preload critical resources -->
   <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
   <link rel="preload" href="/src/main.js" as="script">
   ```

2. **Cache Headers**
   ```nginx
   # Long-term caching for assets
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|wasm)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   
   # Short-term caching for HTML
   location ~* \.html$ {
       expires 1h;
       add_header Cache-Control "public, must-revalidate";
   }
   ```

## Monitoring & Analytics

### Performance Monitoring

1. **Web Vitals Tracking**
   ```javascript
   // Built-in performance monitoring
   import { performanceMonitor } from './utils/PerformanceUtils.js';
   
   performanceMonitor.options.analyticsEndpoint = 'https://analytics.photoalbum.app/vitals';
   ```

2. **Error Tracking**
   ```javascript
   // Configure error reporting
   window.addEventListener('error', (event) => {
     // Send to error tracking service
     fetch('/api/errors', {
       method: 'POST',
       body: JSON.stringify({
         message: event.error.message,
         stack: event.error.stack,
         url: window.location.href,
         userAgent: navigator.userAgent,
         timestamp: new Date().toISOString()
       })
     });
   });
   ```

### Health Checks

1. **Application Health**
   ```javascript
   // src/health.js
   export async function healthCheck() {
     const checks = {
       database: await checkDatabase(),
       storage: await checkStorage(),
       performance: await checkPerformance()
     };
     
     return {
       status: Object.values(checks).every(Boolean) ? 'healthy' : 'unhealthy',
       checks,
       timestamp: new Date().toISOString()
     };
   }
   ```

2. **Uptime Monitoring**
   ```yaml
   # .github/workflows/uptime.yml
   name: Uptime Check
   
   on:
     schedule:
       - cron: '*/5 * * * *'  # Every 5 minutes
   
   jobs:
     uptime:
       runs-on: ubuntu-latest
       steps:
         - name: Check uptime
           run: |
             curl -f https://photoalbum.app/health || exit 1
   ```

## Security Considerations

### HTTPS Configuration

1. **SSL Certificate**
   ```bash
   # Let's Encrypt with Certbot
   sudo certbot --nginx -d photoalbum.app -d www.photoalbum.app
   ```

2. **Security Headers**
   ```nginx
   # Security headers
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:;" always;
   add_header X-Frame-Options "DENY" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   ```

### Environment Security

1. **Secrets Management**
   ```bash
   # Use environment variables for sensitive data
   export API_KEY="your-secret-key"
   export DB_PASSWORD="secure-password"
   ```

2. **Access Control**
   ```yaml
   # GitHub Actions secrets
   secrets:
     DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
     API_KEY: ${{ secrets.API_KEY }}
   ```

## Troubleshooting

### Common Issues

1. **WASM Loading Issues**
   ```javascript
   // Ensure proper MIME type
   if (!WebAssembly) {
     console.error('WebAssembly not supported');
     // Fallback implementation
   }
   ```

2. **Service Worker Issues**
   ```javascript
   // Debug service worker
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.addEventListener('error', (event) => {
       console.error('Service Worker error:', event);
     });
   }
   ```

3. **Build Failures**
   ```bash
   # Clear cache and rebuild
   npm run clean
   rm -rf node_modules
   npm install
   npm run build
   ```

### Debugging

1. **Production Debugging**
   ```javascript
   // Enable debug mode
   localStorage.setItem('debug', 'true');
   
   // Performance debugging
   performance.mark('app-start');
   // ... app code
   performance.mark('app-ready');
   performance.measure('app-load', 'app-start', 'app-ready');
   ```

2. **Network Debugging**
   ```javascript
   // Monitor network requests
   if (navigator.serviceWorker && navigator.serviceWorker.controller) {
     navigator.serviceWorker.controller.postMessage({
       type: 'DEBUG_CACHE'
     });
   }
   ```

## Rollback Strategy

### Quick Rollback

1. **Git-based Rollback**
   ```bash
   # Rollback to previous commit
   git revert HEAD
   git push origin main
   
   # Or rollback to specific version
   git reset --hard <commit-hash>
   git push --force-with-lease origin main
   ```

2. **Environment Rollback**
   ```bash
   # Switch to previous version
   netlify deploy --alias=previous-version
   
   # Promote previous version to production
   netlify deploy --prod --dir=previous-build
   ```

### Blue-Green Deployment

1. **Setup Multiple Environments**
   ```bash
   # Deploy to blue environment
   netlify deploy --alias=blue
   
   # Test blue environment
   curl -f https://blue--photoalbum.netlify.app/health
   
   # Switch production to blue
   netlify deploy --prod --alias=blue
   ```

This deployment guide ensures reliable, performant, and secure deployments of the Photo Album application across various platforms and environments.