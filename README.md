# 🚀 Adobe Stock Prompt Generator Pro - V2.0 Web

A modern, responsive web application for scraping Adobe Stock content and generating AI prompts. This is the web version of the desktop application, built with Next.js and deployed on Vercel.

## ✨ Features

### 🎨 Modern UI
- **Multi-theme support**: Cyberpunk, Dark, Light, Nord, Dracula, and more
- **Responsive design**: Works seamlessly on desktop, tablet, and mobile
- **Glass morphism effects**: Beautiful modern design with backdrop blur
- **Smooth animations**: Framer Motion animations for enhanced UX

### 🛠️ Advanced Functionality
- **Real-time preview**: Live preview of prompt formatting
- **Progress tracking**: Real-time progress updates during scraping
- **Download support**: Download generated prompts as text files
- **Error handling**: Comprehensive error handling and user feedback
- **Input validation**: Client and server-side validation

### 🔧 Configuration Options
- **URL Configuration**: Support for Adobe Stock URLs
- **Page Range**: Specify start and end pages for scraping
- **Format Settings**: 
  - Include/exclude prefix, suffix, date, parameters
  - Aspect ratio support
  - Case conversion options
  - Custom parameters

### 🚀 Performance Optimized
- **Puppeteer integration**: Fast, headless browser scraping
- **Resource optimization**: Blocks unnecessary resources for faster scraping
- **Vercel deployment**: Optimized for serverless deployment
- **TypeScript**: Full type safety throughout the application

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS, Custom CSS with glass morphism
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend**: Next.js API Routes
- **Scraping**: Puppeteer, Cheerio
- **Deployment**: Vercel
- **Notifications**: React Hot Toast

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd V2-Web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🚀 Deployment on Vercel

### Quick Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Environment Variables
No environment variables are required for basic functionality. The application works out of the box.

## 📁 Project Structure

```
V2-Web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   └── scrape/        # Scraping endpoint
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── URLCard.tsx
│   │   ├── FormatCard.tsx
│   │   ├── ControlCard.tsx
│   │   ├── PreviewCard.tsx
│   │   ├── StatsCard.tsx
│   │   └── Footer.tsx
│   ├── lib/                   # Utilities and stores
│   │   └── store.ts          # Zustand store
│   └── types/                 # TypeScript definitions
│       └── index.ts
├── public/                    # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── README.md
```

## 🎯 Usage

1. **Enter Adobe Stock URL**: Paste the Adobe Stock search URL
2. **Set Page Range**: Specify start and end pages to scrape
3. **Configure Format**: 
   - Toggle prefix, suffix, date options
   - Set custom prefix, suffix, and parameters
   - Configure aspect ratio
4. **Preview**: Review the prompt format in real-time
5. **Start Scraping**: Click the start button to begin scraping
6. **Download Results**: Download the generated prompts as a text file

## 📊 API Endpoints

### POST `/api/scrape`
Scrapes Adobe Stock pages and generates formatted prompts.

**Request Body:**
```typescript
{
  url: string;
  startPage: number;
  endPage: number;
  config: {
    includePrefix: boolean;
    includeSuffix: boolean;
    includeDate: boolean;
    includeParams: boolean;
    includeAspectRatio: boolean;
    toLowerCase: boolean;
    prefix: string;
    suffix: string;
    aspectRatio: string;
    additionalParams: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  prompts: string[];
  stats: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    totalPrompts: number;
    processingTime: string;
  };
  error?: string;
}
```

## 🎨 Themes

The application supports multiple themes:
- **Cyberpunk**: Dark theme with blue accents (default)
- **Dark**: Classic dark theme
- **Light**: Clean light theme
- **Nord**: Nordic color palette
- **Dracula**: Popular Dracula theme

## 🔧 Customization

### Adding New Themes
1. Add theme definition to `src/types/index.ts`
2. Update TailwindCSS config if needed
3. Theme will be automatically available in the theme selector

### Modifying Scraping Logic
1. Edit `src/app/api/scrape/route.ts`
2. Modify Puppeteer configuration or parsing logic
3. Test thoroughly before deployment

## 🚨 Limitations

- **Vercel Function Timeout**: Maximum execution time is 5 minutes
- **Page Limit**: Maximum 20 pages per request to prevent timeouts
- **Rate Limiting**: Be respectful to Adobe Stock servers
- **Browser Resources**: Optimized to run in Vercel's serverless environment

## 🛡️ Error Handling

The application includes comprehensive error handling:
- **Input validation**: Client and server-side validation
- **Network errors**: Graceful handling of network issues
- **Scraping errors**: Individual page failures don't stop the entire process
- **User feedback**: Toast notifications for all user actions

## 📈 Performance Tips

1. **Optimal Page Range**: Keep page ranges reasonable (1-10 pages)
2. **Network Conditions**: Better results with stable internet connection
3. **Browser Compatibility**: Modern browsers recommended
4. **Mobile Usage**: Fully functional on mobile devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆕 Version History

### v2.0 Web (Current)
- ✅ Complete rewrite in Next.js
- ✅ Modern responsive design
- ✅ Multi-theme support
- ✅ Vercel deployment ready
- ✅ Real-time progress tracking
- ✅ Download functionality

### v1.1 Desktop
- ✅ Improved error handling
- ✅ Better UI responsiveness
- ✅ Enhanced scraping logic
- ✅ Multiple theme support

## 💫 Deployment URL

Once deployed on Vercel, your application will be available at:
```
https://your-app-name.vercel.app
```

---

**Built with ❤️ using Next.js and deployed on Vercel**
