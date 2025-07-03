import { Search, X } from "lucide-react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from "react-native";

const SearchDropdown = ({
  placeholder = "Search...",
  fetchData,
  onValueChange,
  onReset, // Add a new onReset callback prop
}: {
  placeholder?: string;
  fetchData: (query: string, page: number) => Promise<any[]>;
  onValueChange: (value: string) => void;
  onReset?: () => void; // Optional callback when search is reset
}) => {
  const [items, setItems] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [filteredValues, setFilteredValues] = useState<string[]>([]);
  const [openDropDown, setOpenDropDown] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<TextInput>(null);

  const loadData = useCallback(
    async (query: string, newPage = 1, append = false) => {
      if (loading || (!hasMore && append)) return;

      setLoading(true);
      try {
        const data = await fetchData(query, newPage);

        if (append) {
          setItems((prev) => [...prev, ...data]);
          setFilteredValues((prev) => [...prev, ...data]);
        } else {
          setItems(data);
          setFilteredValues(data);
        }

        setHasMore(data.length > 0);
        setPage(newPage);
        setOpenDropDown(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, fetchData]
  );

  const handleFocus = () => {
    loadData(text, 1, false);
  };

  const handleChangeText = (input: string) => {
    setText(input);
    onValueChange(input);
    setHasMore(true);
    loadData(input, 1, false);
  };

  const handleSelectValue = (selectedValue: string) => {
    setText(selectedValue);
    onValueChange(selectedValue);
    setFilteredValues([]);
    setItems([]);
    setOpenDropDown(false);
    inputRef.current?.blur();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    if (isCloseToBottom && !loading && hasMore) {
      loadData(text, page + 1, true);
    }
  };

  const resetSearch = () => {
    setText("");
    setItems([]);
    setFilteredValues([]);
    setOpenDropDown(false);
    setPage(1);
    setHasMore(true);
    inputRef.current?.blur();
    onValueChange("");

    // Call the onReset callback to notify parent component
    if (onReset) {
      onReset();
    }
  };

  useEffect(() => {
    if (text === "") {
      setOpenDropDown(false);
    }
  }, [text]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{placeholder}</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor="#888"
          value={text}
        />
        <TouchableOpacity onPress={resetSearch} style={styles.iconWrapper}>
          {openDropDown || text.length > 0 ? (
            <X color="#aaa" size={20} />
          ) : (
            <Search color="#aaa" size={20} />
          )}
        </TouchableOpacity>
      </View>

      {openDropDown && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setOpenDropDown(false);
              inputRef.current?.blur();
            }}
          >
            <View />
          </TouchableOpacity>

          <View style={styles.dropdownWrapper}>
            <ScrollView
              style={styles.dropdownContainer}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={100}
            >
              {filteredValues.length > 0 ? (
                filteredValues.map((item: any, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectValue(item.name)}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.itemText}>{item.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No records found</Text>
                </View>
              )}
              {loading && (
                <View style={styles.loader}>
                  <ActivityIndicator size="small" color="#aaa" />
                </View>
              )}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  iconWrapper: {
    position: "absolute",
    right: 16,
    justifyContent: "center",
    alignItems: "center",
    height: 20,
    width: 20,
  },
  dropdownWrapper: {
    maxHeight: 200,
    marginTop: 4,
    borderRadius: 12,
    borderColor: "#ddd",
    borderWidth: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownContainer: {
    width: "100%",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomColor: "#f0f0f0",
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: 16,
    color: "#333",
  },
  noResults: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "#999",
  },
  loader: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SearchDropdown;
