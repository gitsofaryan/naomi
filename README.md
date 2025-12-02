# 👗 Naomi - AI Fashion Stylist

<div align="center">

**Your Personal AI-Powered Virtual Wardrobe & Styling Assistant**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.181-green)](https://threejs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Powered-brightgreen)](https://openai.com/)

</div>

---

## ✨ Overview

**Naomi** is a cutting-edge AI fashion stylist application that combines computer vision, 3D rendering, and generative AI to revolutionize how you interact with your wardrobe. Try on clothes virtually, get personalized styling advice, and manage your digital closet—all powered by advanced AI technology.

## 🚀 Features

### 🪞 Virtual Mirror
- **Real-time AR Try-On**: See how clothes look on you using your webcam
- **Pose Detection**: Powered by MediaPipe for accurate body tracking
- **Background Removal**: Automatic background removal for clean compositing
- **3D Visualization**: Realistic clothing rendering with Three.js

### 👔 Smart Closet
- **Digital Wardrobe**: Organize and manage your clothing collection
- **Visual Catalog**: Browse your items with an intuitive interface
- **Quick Access**: Find the perfect outfit in seconds

### 🎨 AI Stylist
- **Personalized Recommendations**: Get outfit suggestions tailored to your style
- **Fashion Advice**: Chat with an AI stylist powered by OpenAI
- **Trend Insights**: Stay updated with the latest fashion trends
- **Occasion-Based Styling**: Get recommendations for any event

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI/UX**: 
  - [React 19](https://reactjs.org/)
  - [Tailwind CSS 4](https://tailwindcss.com/)
  - [Framer Motion](https://www.framer.com/motion/) for animations
  - [Lucide React](https://lucide.dev/) for icons
- **3D Graphics**: 
  - [Three.js](https://threejs.org/)
  - [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)
  - [@react-three/drei](https://github.com/pmndrs/drei)
- **Computer Vision**:
  - [MediaPipe](https://mediapipe.dev/) for pose detection
  - [@imgly/background-removal](https://github.com/imgly/background-removal-js)
- **AI**: [OpenAI API](https://openai.com/) for intelligent styling advice
- **Storage**: IndexedDB via [idb](https://github.com/jakearchibald/idb)
- **Webcam**: [react-webcam](https://github.com/mozmorris/react-webcam)

## 📦 Installation

### Prerequisites
- Node.js 20+ 
- npm, yarn, pnpm, or bun
- OpenAI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/gitsofaryan/naomi.git
   cd naomi
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### Virtual Mirror
1. Navigate to the home page
2. Allow camera access when prompted
3. Stand in front of your webcam
4. Upload or select clothing items to try on
5. See real-time visualization of how clothes look on you

### Managing Your Closet
1. Go to `/closet`
2. Upload photos of your clothing items
3. Organize by category, color, or season
4. Browse your digital wardrobe anytime

### Getting Style Advice
1. Visit `/stylist`
2. Chat with the AI stylist
3. Ask for outfit recommendations
4. Get personalized fashion advice based on your wardrobe

## 📁 Project Structure

```
naomi/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home - Virtual Mirror
│   ├── closet/            # Digital wardrobe page
│   ├── stylist/           # AI stylist chat page
│   ├── api/               # API routes
│   │   └── chat/          # OpenAI chat endpoint
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Navigation.tsx     # Navigation bar
│   └── VirtualMirror.tsx  # AR try-on component
├── lib/                   # Utility functions
│   ├── db.ts             # IndexedDB helpers
│   └── utils.ts          # General utilities
├── public/               # Static assets
└── package.json          # Dependencies
```

## 🔧 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🌟 Key Components

### VirtualMirror
The core AR component that handles webcam input, pose detection, and clothing overlay rendering.

### Navigation
Responsive navigation bar for seamless app navigation.

### AI Chat Integration
Real-time fashion advice using OpenAI's GPT models with context about your wardrobe.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for computer vision capabilities
- [OpenAI](https://openai.com/) for AI-powered styling
- [Three.js](https://threejs.org/) for 3D rendering
- [Vercel](https://vercel.com/) for hosting and deployment

## 📞 Contact

**Aryan** - [@gitsofaryan](https://github.com/gitsofaryan)

Project Link: [https://github.com/gitsofaryan/naomi](https://github.com/gitsofaryan/naomi)

---

<div align="center">
Made with ❤️ and AI
</div>
