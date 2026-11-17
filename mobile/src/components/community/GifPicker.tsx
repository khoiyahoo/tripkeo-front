import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { Input } from "@/components/form/fields";

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
// Key demo công khai của Tenor — giống bản web khi không có Giphy key.
const TENOR_KEY = "LIVDSRZULELA";

interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
}

const search = async (q: string): Promise<GifResult[]> => {
  if (GIPHY_API_KEY) {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`
    );
    const json = (await res.json()) as {
      data: {
        id: string;
        images: {
          fixed_height_small: { url: string };
          original: { url: string };
        };
      }[];
    };
    return json.data.map((g) => ({
      id: g.id,
      url: g.images.original.url,
      previewUrl: g.images.fixed_height_small.url,
    }));
  }
  const res = await fetch(
    `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=12&contentfilter=medium&media_filter=basic`
  );
  const json = (await res.json()) as {
    results?: {
      id: string;
      media: { gif: { url: string }; tinygif: { url: string } }[];
    }[];
  };
  return (json.results ?? []).map((g) => ({
    id: g.id,
    url: g.media[0]?.gif.url ?? "",
    previewUrl: g.media[0]?.tinygif.url ?? "",
  }));
};

export const GifPicker = ({
  onSelect,
}: {
  onSelect: (url: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      setGifs(await search(query.trim()));
    } catch {
      Alert.alert("Lỗi", "Không thể tải GIF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="gap-2 border-outline-variant border-t p-3">
      <View className="flex-row gap-2">
        <Input
          className="h-10 flex-1"
          onChangeText={setQuery}
          onSubmitEditing={run}
          placeholder="Tìm GIF..."
          returnKeyType="search"
          value={query}
        />
        <Pressable
          className="h-10 items-center justify-center rounded-xl bg-primary-500 px-4"
          onPress={run}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white">Tìm</Text>
          )}
        </Pressable>
      </View>
      {gifs.length > 0 && (
        <FlatList
          data={gifs}
          horizontal
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelect(item.url)}>
              <Image
                contentFit="cover"
                source={{ uri: item.previewUrl }}
                style={{
                  width: 96,
                  height: 72,
                  borderRadius: 8,
                  marginRight: 8,
                }}
              />
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
};
