'use client';

import { useState, useMemo, useCallback } from 'react';
import { Autocomplete, TextField, Chip, Box, IconButton, Popover } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useGetTagsQuery, useCreateTagMutation } from '@/store';
import type { Tag } from '@/types';

interface TagInputProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

const TAG_COLORS = [
  '#1976d2',
  '#9c27b0',
  '#2e7d32',
  '#ed6c02',
  '#d32f2f',
  '#0288d1',
  '#7b1fa2',
  '#388e3c',
];

export default function TagInput({ value, onChange, disabled }: TagInputProps) {
  const { data: tags = [], isLoading } = useGetTagsQuery({});
  const [createTag] = useCreateTagMutation();
  const [inputValue, setInputValue] = useState('');
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  const selectedTags = useMemo(
    () => tags.filter((tag: Tag) => value.includes(tag.id)),
    [tags, value]
  );

  const handleCreateTag = useCallback(async () => {
    if (!inputValue.trim()) return;

    try {
      const newTag = await createTag({
        name: inputValue.trim(),
        color: selectedColor,
      }).unwrap();
      onChange([...value, newTag.id]);
      setInputValue('');
      setColorAnchor(null);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  }, [inputValue, selectedColor, createTag, onChange, value]);

  const handleChange = useCallback(
    (_: unknown, newValue: Tag[]) => {
      onChange(newValue.map((tag: Tag) => tag.id));
    },
    [onChange]
  );

  return (
    <Box>
      <Autocomplete
        multiple
        options={tags}
        value={selectedTags}
        loading={isLoading}
        disabled={disabled}
        getOptionLabel={(option: Tag) => option.name}
        inputValue={inputValue}
        onInputChange={(_, newValue) => setInputValue(newValue)}
        onChange={handleChange}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Tags"
            placeholder="Select or create tags"
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {inputValue && !tags.find((t: Tag) => t.name === inputValue) && (
                    <IconButton size="small" onClick={(e) => setColorAnchor(e.currentTarget)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={(value: Tag[], getTagProps) =>
          value.map((tag, index) => (
            <Chip
              {...getTagProps({ index })}
              key={tag.id}
              label={tag.name}
              size="small"
              sx={{
                backgroundColor: tag.color,
                color: 'white',
              }}
            />
          ))
        }
        renderOption={(props, option: Tag) => (
          <Box component="li" {...props}>
            <Chip
              size="small"
              label={option.name}
              sx={{
                backgroundColor: option.color,
                color: 'white',
              }}
            />
          </Box>
        )}
        noOptionsText={
          inputValue ? (
            <Box sx={{ cursor: 'pointer' }} onClick={(e) => setColorAnchor(e.currentTarget)}>
              Create &quot;{inputValue}&quot;
            </Box>
          ) : (
            'No tags'
          )
        }
      />

      <Popover
        open={!!colorAnchor}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {TAG_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => setSelectedColor(color)}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: selectedColor === color ? '2px solid black' : 'none',
                }}
              />
            ))}
          </Box>
          <Chip
            label={inputValue || 'New Tag'}
            sx={{
              backgroundColor: selectedColor,
              color: 'white',
              cursor: 'pointer',
            }}
            onClick={handleCreateTag}
          />
        </Box>
      </Popover>
    </Box>
  );
}
