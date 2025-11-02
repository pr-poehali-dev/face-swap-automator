import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface FaceLibraryItem {
  id: string;
  name: string;
  image: string;
}

interface ProcessedImage {
  id: string;
  original: string;
  result: string;
  timestamp: Date;
}

const Index = () => {
  const { toast } = useToast();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const faceLibrary: FaceLibraryItem[] = [
    { id: '1', name: 'Модель A', image: 'https://cdn.poehali.dev/projects/9c069475-6d35-4bc8-9044-5dab414c59d0/files/a1de085b-d244-4b83-9641-de744a883dda.jpg' },
    { id: '2', name: 'Модель B', image: 'https://cdn.poehali.dev/projects/9c069475-6d35-4bc8-9044-5dab414c59d0/files/81395471-00d9-42b1-8ec0-0a6d757d8eb7.jpg' },
    { id: '3', name: 'Модель C', image: 'https://cdn.poehali.dev/projects/9c069475-6d35-4bc8-9044-5dab414c59d0/files/764d51ae-9c5a-479e-b381-b2d76f70d621.jpg' },
    { id: '4', name: 'Модель D', image: '/placeholder.svg' },
    { id: '5', name: 'Модель E', image: '/placeholder.svg' },
    { id: '6', name: 'Модель F', image: '/placeholder.svg' },
  ];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        toast({
          title: "Фото загружено!",
          description: "Выберите лицо из библиотеки для замены",
        });
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        toast({
          title: "Фото загружено!",
          description: "Выберите лицо из библиотеки для замены",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!uploadedImage || !selectedFace) return;

    const selectedFaceData = faceLibrary.find(f => f.id === selectedFace);
    if (!selectedFaceData) return;

    setIsProcessing(true);

    try {
      const response = await fetch('https://functions.poehali.dev/990d6fe8-4c04-490d-b68b-6c4b0655e9fd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_image: uploadedImage,
          swap_image: selectedFaceData.image,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обработки');
      }

      const newProcessed: ProcessedImage = {
        id: Date.now().toString(),
        original: uploadedImage,
        result: data.result_url,
        timestamp: new Date(),
      };
      
      setProcessedImages([newProcessed, ...processedImages]);
      toast({
        title: "✨ Готово!",
        description: "Лицо успешно заменено",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : 'Не удалось обработать изображение',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
            FaceSwap AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Замена лиц с сохранением мимики и естественности
          </p>
        </div>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 glass">
            <TabsTrigger value="editor" className="text-base">
              <Icon name="Wand2" size={18} className="mr-2" />
              Редактор
            </TabsTrigger>
            <TabsTrigger value="gallery" className="text-base">
              <Icon name="Images" size={18} className="mr-2" />
              Галерея ({processedImages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="glass p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Icon name="Upload" size={24} />
                  Загрузка фото
                </h2>
                
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-primary/40 rounded-2xl p-12 text-center hover:border-primary/60 transition-all cursor-pointer bg-gradient-card"
                >
                  {uploadedImage ? (
                    <div className="space-y-4">
                      <img
                        src={uploadedImage}
                        alt="Загруженное фото"
                        className="max-h-80 mx-auto rounded-xl shadow-2xl"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setUploadedImage(null)}
                        className="glass"
                      >
                        <Icon name="X" size={16} className="mr-2" />
                        Удалить
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-full gradient-primary flex items-center justify-center">
                        <Icon name="ImagePlus" size={40} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xl font-semibold mb-2">
                          Перетащите фото сюда
                        </p>
                        <p className="text-muted-foreground mb-4">
                          или нажмите для выбора
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="gradient-primary"
                      >
                        <Icon name="FolderOpen" size={18} className="mr-2" />
                        Выбрать файл
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="glass p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Icon name="Users" size={24} />
                  Библиотека лиц
                </h2>
                
                <div className="grid grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto pr-2">
                  {faceLibrary.map((face) => (
                    <div
                      key={face.id}
                      onClick={() => setSelectedFace(face.id)}
                      className={`cursor-pointer rounded-xl overflow-hidden transition-all hover:scale-105 ${
                        selectedFace === face.id
                          ? 'ring-4 ring-primary shadow-xl'
                          : 'ring-1 ring-border'
                      }`}
                    >
                      <img
                        src={face.image}
                        alt={face.name}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-2 bg-card/80 backdrop-blur">
                        <p className="text-xs font-medium text-center truncate">
                          {face.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={processImage}
                  disabled={!uploadedImage || !selectedFace || isProcessing}
                  className="w-full gradient-primary h-14 text-lg font-bold"
                >
                  {isProcessing ? (
                    <>
                      <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Icon name="Sparkles" size={20} className="mr-2" />
                      Заменить лицо
                    </>
                  )}
                </Button>
              </Card>
            </div>

            {uploadedImage && selectedFace && (
              <Card className="glass p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Icon name="Eye" size={24} />
                  Предпросмотр
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <Badge className="mb-3 glass">Оригинал</Badge>
                    <img
                      src={uploadedImage}
                      alt="Оригинал"
                      className="w-full rounded-xl shadow-lg"
                    />
                  </div>
                  <div>
                    <Badge className="mb-3 gradient-primary">Результат</Badge>
                    <div className="relative">
                      <img
                        src={uploadedImage}
                        alt="Результат"
                        className="w-full rounded-xl shadow-lg"
                      />
                      {isProcessing && (
                        <div className="absolute inset-0 glass rounded-xl flex items-center justify-center">
                          <Icon name="Loader2" size={48} className="animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            {processedImages.length === 0 ? (
              <Card className="glass p-16 text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center mb-6">
                  <Icon name="ImageOff" size={40} className="text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Галерея пуста</h3>
                <p className="text-muted-foreground">
                  Обработанные изображения появятся здесь
                </p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedImages.map((item) => (
                  <Card key={item.id} className="glass overflow-hidden group">
                    <div className="relative">
                      <img
                        src={item.result}
                        alt="Результат"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary">
                          <Icon name="Download" size={20} />
                        </Button>
                        <Button size="icon" variant="secondary">
                          <Icon name="Share2" size={20} />
                        </Button>
                        <Button size="icon" variant="destructive">
                          <Icon name="Trash2" size={20} />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        {item.timestamp.toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;