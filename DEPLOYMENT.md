# Deployment Guide

## Vercel Deployment

This guide covers deploying the NLP Prompt Database to Vercel.

### Prerequisites

- [Vercel Account](https://vercel.com/signup) (free tier available)
- [Vercel CLI](https://vercel.com/cli) (optional but recommended)
- GitHub repository connected to Vercel

### Quick Deploy to Vercel

#### Method 1: Using Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select this repository

2. **Configure Project**
   - Framework Preset: **Other** (Node.js)
   - Root Directory: `./` (leave as default)
   - Build Command: `npm run build`
   - Output Directory: `public`
   - Install Command: `npm install`

3. **Environment Variables** (Optional)
   Add the following environment variables in Project Settings:
   ```
   NODE_ENV=production
   PORT=3001
   OPENAI_API_KEY=your-api-key-here
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be available at `https://your-project.vercel.app`

#### Method 2: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Configuration Files

The project includes a `vercel.json` configuration file that handles:
- Node.js runtime configuration
- API routes mapping
- Static file serving from `public/` directory
- Production environment settings

### Environment Variables for Production

Set these in your Vercel project settings:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | production | Yes |
| `PORT` | Server port | 3001 | No |
| `OPENAI_API_KEY` | OpenAI API key for AI features | - | No |
| `CORS_ORIGIN` | Allowed CORS origins | * | No |
| `DATA_FILE_PATH` | Path to data file | ./data/prompts.json | No |

### Post-Deployment Checklist

- [ ] Verify the app loads at your Vercel URL
- [ ] Test creating a new prompt
- [ ] Test search and filtering
- [ ] Test API endpoints (`/api/data`, `/api/health`)
- [ ] Check service worker registration (PWA features)
- [ ] Verify analytics dashboard
- [ ] Test import/export functionality

### Troubleshooting

#### Build Fails

If the build fails with vendor library errors:
```bash
# Locally test the build
npm run build

# Check if vendor files are generated
ls -la public/vendor/
```

The build script automatically falls back to copying from `node_modules` if CDN downloads fail.

#### API Routes Not Working

Ensure your `vercel.json` has the correct routes configuration:
```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    }
  ]
}
```

#### Data Persistence Issues

Note: Vercel's serverless functions are stateless. For production use:
- Consider using Vercel KV, Vercel Postgres, or external database
- Current implementation uses file-based storage (suitable for development/personal use)
- For production, implement a proper database adapter

### Production Considerations

1. **Database**: The current file-based database works for personal use but consider:
   - MongoDB Atlas (free tier available)
   - Vercel KV Store
   - PostgreSQL (Vercel Postgres or Supabase)

2. **Environment Variables**: Always set:
   - `NODE_ENV=production`
   - Secure `OPENAI_API_KEY` if using AI features
   - Configure `CORS_ORIGIN` to your domain

3. **Monitoring**: Enable Vercel Analytics for:
   - Performance monitoring
   - Error tracking
   - Usage statistics

### Custom Domain

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Wait for DNS propagation (up to 48 hours)

### Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

Configure branch settings in Project Settings → Git.

### Support

For issues specific to Vercel deployment:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)

## Alternative Deployment Options

### Netlify

1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `public`
4. Environment variables: Same as Vercel

### Heroku

1. Create a new Heroku app
2. Add Node.js buildpack
3. Set environment variables
4. Deploy via Git:
   ```bash
   git push heroku main
   ```

### Self-Hosted / VPS

For self-hosting on your own server:

1. **Install Node.js** (v16 or higher)
2. **Clone repository**
   ```bash
   git clone <your-repo>
   cd nlp-prompt-base
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment**
   ```bash
   cp .env.sample .env
   # Edit .env with your settings
   ```

5. **Start the server**
   ```bash
   npm start
   # Or use PM2 for production:
   npm install -g pm2
   pm2 start server.js --name nlp-prompt-db
   ```

6. **Configure reverse proxy** (nginx/Apache)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Docker Deployment

A `Dockerfile` can be created for containerized deployment:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t nlp-prompt-db .
docker run -p 3001:3001 nlp-prompt-db
```

---

**Note**: This project is optimized for personal use. For high-traffic production environments, consider implementing proper database solutions, caching, and CDN integration.
