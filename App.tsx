

import React, { useState, useEffect, useCallback } from 'react';
import { LogoPosition, CopywritingFramework, FacebookPage, SavedFacebookPage, GeneratedPost, AiProvider, OpenAIModel } from './types';
import { generatePostCaption as generateWithGemini } from './services/geminiService';
import { generatePostCaption as generateWithOpenAI } from './services/openaiService';
import { UploadIcon, SparklesIcon, DownloadIcon, MinusCircleIcon, PencilIcon, LinkIcon, PlusIcon, CopyIcon, KeyIcon, CpuChipIcon } from './components/icons';

const SAVED_PAGES_KEY = 'savedFacebookPages';
const MAX_IMAGE_UPLOADS = 50;

const App: React.FC = () => {
  const [mainImages, setMainImages] = useState<File[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>(LogoPosition.TopRight);
  const [logoScale, setLogoScale] = useState<number>(15); // Percentage of image width
  const [logoOpacity, setLogoOpacity] = useState<number>(90); // Percentage
  const [watermarkedImages, setWatermarkedImages] = useState<string[]>([]);

  const [topic, setTopic] = useState<string>('');
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([{ id: Date.now(), url: '', contactInfo: '' }]);
  const [savedPages, setSavedPages] = useState<SavedFacebookPage[]>([]);
  const [framework, setFramework] = useState<CopywritingFramework>(CopywritingFramework.Auto);
  
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activePostTab, setActivePostTab] = useState<number>(0);

  const [aiProvider, setAiProvider] = useState<AiProvider>(AiProvider.OpenAI);
  const [openAiModel, setOpenAiModel] = useState<OpenAIModel>(OpenAIModel.GPT4o);
  
  useEffect(() => {
    try {
      const storedPages = localStorage.getItem(SAVED_PAGES_KEY);
      if (storedPages) {
        setSavedPages(JSON.parse(storedPages));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  const updateAndSavePages = () => {
    const validPages = facebookPages
      .filter(page => page.url.trim().startsWith('http'))
      .map(({ url, contactInfo }) => ({ url, contactInfo }));

    if (validPages.length === 0) return;

    try {
      const savedPagesMap = new Map(savedPages.map(p => [p.url, p]));
      validPages.forEach(p => savedPagesMap.set(p.url, p));
      
      const pagesToSave = Array.from(savedPagesMap.values());
      setSavedPages(pagesToSave);
      localStorage.setItem(SAVED_PAGES_KEY, JSON.stringify(pagesToSave));
    } catch (error) {
      console.error("Failed to save pages to localStorage", error);
    }
  };

  const applyWatermark = useCallback(() => {
    if (mainImages.length === 0 || !logo) {
      setWatermarkedImages([]);
      return;
    }

    const processImages = async () => {
      const newWatermarkedImages: string[] = [];
      const logoUrl = URL.createObjectURL(logo);
      const logoImg = new Image();
      logoImg.src = logoUrl;
      await new Promise(resolve => logoImg.onload = resolve);

      for (const imageFile of mainImages) {
        const imageUrl = URL.createObjectURL(imageFile);
        const mainImg = new Image();
        mainImg.src = imageUrl;
        await new Promise(resolve => mainImg.onload = resolve);

        const canvas = document.createElement('canvas');
        canvas.width = mainImg.width;
        canvas.height = mainImg.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(mainImg, 0, 0);

          const logoWidth = canvas.width * (logoScale / 100);
          const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
          
          let x = 0;
          let y = 0;
          const margin = canvas.width * 0.02; // 2% margin

          switch (logoPosition) {
            case LogoPosition.TopLeft: x = margin; y = margin; break;
            case LogoPosition.TopRight: x = canvas.width - logoWidth - margin; y = margin; break;
            case LogoPosition.BottomLeft: x = margin; y = canvas.height - logoHeight - margin; break;
            case LogoPosition.Center: x = (canvas.width - logoWidth) / 2; y = (canvas.height - logoHeight) / 2; break;
            case LogoPosition.BottomRight: default: x = canvas.width - logoWidth - margin; y = canvas.height - logoHeight - margin; break;
          }

          ctx.globalAlpha = logoOpacity / 100;
          ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;
          newWatermarkedImages.push(canvas.toDataURL('image/jpeg'));
        }
        URL.revokeObjectURL(imageUrl);
      }
      setWatermarkedImages(newWatermarkedImages);
      URL.revokeObjectURL(logoUrl);
    };

    processImages();
  }, [mainImages, logo, logoPosition, logoScale, logoOpacity]);

  useEffect(() => {
    applyWatermark();
  }, [applyWatermark]);

  const handleMainImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    let selectedFiles = Array.from(files).slice(0, MAX_IMAGE_UPLOADS);
    setMainImages(selectedFiles);
  };

  const handleGeneratePost = async () => {
    if (!topic || watermarkedImages.length === 0) {
      alert('Please provide a topic and upload images with a logo first.');
      return;
    }

    setIsGenerating(true);
    setGeneratedPosts([]);
    updateAndSavePages();
    
    let baseCaption = '';
    if (aiProvider === AiProvider.OpenAI) {
        baseCaption = await generateWithOpenAI(topic, framework, openAiModel);
    } else {
        baseCaption = await generateWithGemini(topic, framework);
    }
    
    const posts = facebookPages
      .filter(p => p.url.trim() !== '' || p.contactInfo.trim() !== '')
      .map(page => {
        const contactInfo = page.contactInfo.trim();
        const finalCaption = contactInfo 
            ? `${baseCaption.trim()}\n\n---\n\n${contactInfo}` 
            : baseCaption.trim();
        return { url: page.url || 'Default Page', finalCaption };
    });

    if (posts.length === 0) {
        posts.push({ url: 'Your Page Name', finalCaption: baseCaption.trim() });
    }

    setGeneratedPosts(posts);
    setActivePostTab(0);
    setIsGenerating(false);
  };
  
  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `watermarked_image_${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const downloadAllImages = () => watermarkedImages.forEach(downloadImage);

  const handlePageChange = (index: number, field: 'url' | 'contactInfo', value: string) => {
    const newPages = [...facebookPages];
    newPages[index] = { ...newPages[index], [field]: value };
    setFacebookPages(newPages);
  };

  const addPageInput = () => {
    setFacebookPages([...facebookPages, { id: Date.now(), url: '', contactInfo: '' }]);
  };

  const removePageInput = (index: number) => {
    const newPages = facebookPages.filter((_, i) => i !== index);
    setFacebookPages(newPages);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Maybe show a temporary "Copied!" message in the future
    }).catch(err => console.error('Failed to copy text: ', err));
  };

  const getPageName = (url: string) => {
      try {
          const path = new URL(url).pathname;
          const parts = path.split('/').filter(p => p);
          return parts[0] || url;
      } catch (e) {
          return url;
      }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="container mx-auto px-6 lg:px-10 py-4 flex items-center gap-4">
          <SparklesIcon className="w-8 h-8 text-indigo-500" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Social Post Automator</h1>
            <p className="text-slate-600 mt-1">Easily watermark your images and generate engaging posts with AI.</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <div className="flex flex-col gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md transition-shadow hover:shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">1. Upload Your Assets</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileInput label="Main Images" multiple onChange={handleMainImagesChange} />
                <FileInput label="Logo" onChange={e => setLogo(e.target.files ? e.target.files[0] : null)} />
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md transition-shadow hover:shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">2. Configure Watermark</h2>
              <div className="space-y-6">
                <PositionSelector selected={logoPosition} onSelect={setLogoPosition} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <SliderInput label="Logo Scale" value={logoScale} onChange={e => setLogoScale(Number(e.target.value))} min={5} max={50} unit="%" />
                    <SliderInput label="Logo Opacity" value={logoOpacity} onChange={e => setLogoOpacity(Number(e.target.value))} min={10} max={100} unit="%" />
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md transition-shadow hover:shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-slate-800">3. Generate Post Content</h2>
                <div className="space-y-6">
                    <AiProviderSelector selected={aiProvider} onSelect={setAiProvider} />
                    {aiProvider === AiProvider.OpenAI && (
                        <div className="p-4 border-l-4 border-sky-400 bg-sky-50 rounded-r-lg animate-fade-in space-y-4">
                            <SelectInput
                              label="OpenAI Model"
                              value={openAiModel}
                              onChange={e => setOpenAiModel(e.target.value as OpenAIModel)}
                              options={[
                                  { value: OpenAIModel.GPT4oMini, label: 'GPT-4o Mini' },
                                  { value: OpenAIModel.GPT4o, label: 'GPT-4o' },
                                  { value: OpenAIModel.GPT4Turbo, label: 'GPT-4.1 (Turbo)' },
                                  { value: OpenAIModel.GPT35Turbo, label: 'GPT-3.5 Turbo (o3)' },
                              ]}
                              icon={<CpuChipIcon className="h-5 w-5 text-slate-400" />}
                            />
                        </div>
                    )}
                    <TextInput 
                      label="Post Topic / Description" 
                      placeholder="e.g., 'A new collection of summer products'" 
                      value={topic} 
                      onChange={e => setTopic(e.target.value)}
                      icon={<PencilIcon className="h-5 w-5 text-slate-400" />}
                    />
                    <FrameworkSelector selected={framework} onSelect={setFramework} />
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Facebook Pages & Contact Info</label>
                        <p className="text-xs text-slate-500 mb-2">Add contact details for each page. It will be appended to the post.</p>
                        <datalist id="facebook-pages-list">
                          {savedPages.map(page => <option key={page.url} value={page.url} />)}
                        </datalist>
                        <div className="space-y-3 mt-1">
                            {facebookPages.map((page, index) => (
                                <div key={page.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 relative">
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><LinkIcon className="h-5 w-5 text-slate-400" /></div>
                                            <input type="url" className="shadow-sm focus:ring-sky-500 focus:border-sky-500 block w-full sm:text-sm border-slate-300 rounded-md pl-10" placeholder="https://facebook.com/yourpage" value={page.url} onChange={(e) => handlePageChange(index, 'url', e.target.value)} onBlur={updateAndSavePages} list="facebook-pages-list" />
                                        </div>
                                        <textarea className="shadow-sm focus:ring-sky-500 focus:border-sky-500 block w-full sm:text-sm border-slate-300 rounded-md" placeholder="Contact Info (e.g., Phone, Address)" rows={2} value={page.contactInfo} onChange={(e) => handlePageChange(index, 'contactInfo', e.target.value)} onBlur={updateAndSavePages}></textarea>
                                    </div>
                                    {facebookPages.length > 1 && (
                                        <button type="button" onClick={() => removePageInput(index)} className="absolute -top-2 -right-2 p-1 bg-white text-slate-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors" aria-label={`Remove page ${index + 1}`}>
                                            <MinusCircleIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addPageInput} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-md text-sm font-medium text-slate-600 hover:border-sky-500 hover:text-sky-600 transition-colors">
                            <PlusIcon className="w-4 h-4" /> Add another page
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-2">
                <button onClick={handleGeneratePost} disabled={isGenerating || !topic || watermarkedImages.length === 0} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all transform disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-md disabled:cursor-not-allowed disabled:transform-none">
                  <SparklesIcon className="w-6 h-6" />
                  <span className="text-lg">{isGenerating ? 'Generating...' : 'Generate Posts'}</span>
                </button>
                <p className="text-xs text-center text-slate-500 mt-3">Note: For Gemini, the API key must be configured in your environment. OpenAI now uses a secure backend.</p>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md transition-shadow hover:shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Image Preview</h2>
                {watermarkedImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {watermarkedImages.map((src, index) => (
                      <img key={index} src={src} alt={`Preview ${index + 1}`} className="rounded-lg object-cover w-full h-full aspect-square shadow-sm" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50"><p className="text-slate-500 font-medium">Your watermarked images will appear here.</p></div>
                )}
            </div>

            {generatedPosts.length > 0 && (
              <div className="bg-white p-2 sm:p-4 rounded-xl shadow-md animate-fade-in">
                <h2 className="text-xl font-semibold mb-4 px-4 pt-4 sm:px-2 sm:pt-2">Generated Posts</h2>
                <div className="bg-slate-100 rounded-t-lg p-1.5">
                    <nav className="flex gap-x-2" aria-label="Tabs">
                        {generatedPosts.map((post, index) => (
                            <button key={index} onClick={() => setActivePostTab(index)} className={`${ index === activePostTab ? 'bg-white rounded-md shadow-sm text-sky-600 font-semibold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50' } flex-1 whitespace-nowrap py-2.5 px-4 rounded-md text-sm transition-all`}>
                                {getPageName(post.url)}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-2 sm:p-4">
                    {generatedPosts.map((post, index) => (
                        <div key={index} className={index === activePostTab ? 'block' : 'hidden'}>
                            <div className="border border-slate-200 rounded-b-lg p-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 shrink-0">
                                       {getPageName(post.url).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold break-all">{getPageName(post.url)}</p>
                                        <p className="text-xs text-slate-500">Just now</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <p className="whitespace-pre-wrap text-slate-700 bg-slate-50 p-4 rounded-md leading-relaxed">{post.finalCaption}</p>
                                    <button onClick={() => handleCopyText(post.finalCaption)} className="absolute top-2 right-2 p-1.5 text-slate-500 rounded-md bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-colors" title="Copy text">
                                        <CopyIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                                    {watermarkedImages.map((src, imgIndex) => (
                                      <img key={`final-${imgIndex}`} src={src} alt={`Final Post Image ${imgIndex + 1}`} className="rounded-md object-cover w-full h-full aspect-square" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-2 sm:px-4 pb-4">
                  <button onClick={downloadAllImages} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all transform">
                    <DownloadIcon className="w-5 h-5"/> Download All Images
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Helper Components ---

const FileInput: React.FC<{ label: string; multiple?: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, multiple = false, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-sky-500 transition-colors bg-slate-50/50">
      <div className="space-y-1 text-center">
        <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
        <div className="flex text-sm text-slate-600">
          <label htmlFor={`file-upload-${label}`} className="relative cursor-pointer bg-transparent rounded-md font-medium text-sky-600 hover:text-sky-500"><input id={`file-upload-${label}`} type="file" className="sr-only" multiple={multiple} accept="image/*" onChange={onChange} /><span>Upload file(s)</span></label>
          <p className="pl-1">or drag and drop</p>
        </div>
      </div>
    </div>
  </div>
);

const PositionSelector: React.FC<{ selected: LogoPosition; onSelect: (position: LogoPosition) => void; }> = ({ selected, onSelect }) => {
  const positions = Object.values(LogoPosition).map(p => ({ value: p, label: p.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) }));
  const getPositionClasses = (p: LogoPosition) => ({
      [LogoPosition.TopLeft]: 'top-1 left-1', [LogoPosition.TopRight]: 'top-1 right-1', [LogoPosition.BottomLeft]: 'bottom-1 left-1', [LogoPosition.BottomRight]: 'bottom-1 right-1', [LogoPosition.Center]: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  })[p] || '';
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Logo Position</label>
      <div className="grid grid-cols-5 gap-2">
        {positions.map(pos => (
          <button key={pos.value} onClick={() => onSelect(pos.value)} className={`py-2 rounded-md border-2 flex items-center justify-center transition-all transform ${selected === pos.value ? 'bg-gradient-to-r from-sky-500 to-indigo-600 border-indigo-600 text-white shadow-lg scale-105' : 'bg-white border-slate-300 hover:border-sky-400 hover:scale-105'}`} title={pos.label}>
            <div className={`w-6 h-6 border border-dashed border-current rounded-sm relative`}><div className={`w-2 h-2 bg-current rounded-full absolute ${getPositionClasses(pos.value)}`}></div></div>
          </button>
        ))}
      </div>
    </div>
  );
};

const AiProviderSelector: React.FC<{ selected: AiProvider; onSelect: (provider: AiProvider) => void; }> = ({ selected, onSelect }) => {
    const providers = [
        { value: AiProvider.Gemini, label: 'Google Gemini' },
        { value: AiProvider.OpenAI, label: 'OpenAI GPT' },
    ];
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">AI Provider</label>
            <div className="flex rounded-md shadow-sm">
                {providers.map((provider, index) => (
                    <button
                        key={provider.value}
                        onClick={() => onSelect(provider.value)}
                        className={`
                            relative inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium w-full transition-colors
                            ${index === 0 ? 'rounded-l-md' : '-ml-px'}
                            ${index === providers.length - 1 ? 'rounded-r-md' : ''}
                            ${selected === provider.value
                                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 border-indigo-600 text-white z-10'
                                : 'bg-white text-slate-700 hover:bg-slate-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500'
                            }
                        `}
                    >
                        {provider.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const FrameworkSelector: React.FC<{ selected: CopywritingFramework; onSelect: (framework: CopywritingFramework) => void; }> = ({ selected, onSelect }) => {
  const frameworks = [
    { value: CopywritingFramework.Auto, label: 'Auto', description: 'AI chooses the best style.' },
    { value: CopywritingFramework.AIDA, label: 'AIDA', description: 'Attention, Interest, Desire, Action.' },
    { value: CopywritingFramework.PAS, label: 'PAS', description: 'Problem, Agitate, Solution.' },
    { value: CopywritingFramework.Storytelling, label: 'Storytelling', description: 'Tell a compelling story.' },
  ];
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Copywriting Framework</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {frameworks.map(fw => (
          <button key={fw.value} onClick={() => onSelect(fw.value)} className={`p-3 text-center rounded-lg border-2 transition-all transform hover:-translate-y-1 ${selected === fw.value ? 'bg-gradient-to-r from-sky-500 to-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-300 hover:border-sky-400'}`} title={fw.description}>
            <p className="font-semibold text-sm">{fw.label}</p>
            <p className="text-xs opacity-80 hidden md:block mt-1">{fw.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

const SliderInput: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min?: number; max?: number; unit?: string; }> = ({ label, value, onChange, min = 0, max = 100, unit = '' }) => (
    <div>
        <label htmlFor={label} className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-3 mt-1">
            <input id={label} type="range" min={min} max={max} value={value} onChange={onChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600" />
            <span className="text-sm font-semibold font-mono bg-slate-200 py-1 px-2 rounded text-slate-600 w-16 text-center">{value}{unit}</span>
        </div>
    </div>
);

const TextInput: React.FC<{ label: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; icon?: React.ReactNode; type?: string; }> = ({ label, placeholder, value, onChange, icon, type = 'text' }) => (
    <div>
        <label htmlFor={label} className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
            {icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">{icon}</div>}
            <input type={type} id={label} className={`focus:ring-sky-500 focus:border-sky-500 block w-full sm:text-sm border-slate-300 rounded-md transition-colors py-3 ${icon ? 'pl-10 pr-4' : 'px-4'}`} placeholder={placeholder} value={value} onChange={onChange} />
        </div>
    </div>
);

const SelectInput: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
    icon?: React.ReactNode;
}> = ({ label, value, onChange, options, icon }) => (
    <div>
        <label htmlFor={label} className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
            {icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">{icon}</div>}
            <select
                id={label}
                value={value}
                onChange={onChange}
                className={`focus:ring-sky-500 focus:border-sky-500 block w-full sm:text-sm border-slate-300 rounded-md appearance-none transition-colors py-3 ${icon ? 'pl-10' : 'pl-4'} pr-10`}
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </div>
        </div>
    </div>
);

export default App;