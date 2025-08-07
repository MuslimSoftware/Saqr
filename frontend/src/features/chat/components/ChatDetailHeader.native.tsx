import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, TextInput, Pressable, StyleSheet, Keyboard, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

import { TextBody } from '@/features/shared/components/text';
import { BaseRow } from '@/features/shared/components/layout';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { iconSizes } from '@/features/shared/theme/sizes';
import { paddings, gaps } from '@/features/shared/theme/spacing';
import { ChatUpdatePayload } from '@/api/types/chat.types';

interface ChatDetailHeaderProps {
    chatId: string;
    originalName: string;
    updatingChat: boolean;
    updateChat: (chatId: string, payload: ChatUpdatePayload) => Promise<void>;
}

const ChatDetailHeaderComponent: React.FC<ChatDetailHeaderProps> = ({
    chatId,
    originalName,
    updatingChat,
    updateChat,
}) => {
    const { theme } = useTheme();
    const styles = getStyles(theme.colors);

    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(originalName);

    useEffect(() => {
        if (!isEditing) {
            setEditedName(originalName);
        }
    }, [originalName, isEditing]);

    const handleEdit = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleCancel = useCallback(() => {
        setEditedName(originalName);
        setIsEditing(false);
        Keyboard.dismiss();
    }, [originalName]);

    const handleSubmit = useCallback(async () => {
        const nameChanged = editedName.trim() !== originalName;
        const finalName = editedName.trim();

        if (!chatId || !nameChanged) {
            setIsEditing(false);
            Keyboard.dismiss();
            return;
        }

        Keyboard.dismiss();
        try {
            await updateChat(chatId, { 
                name: finalName
            });
        } catch (e) {
            console.error("Submit failed (header component):", e);
        }
        setIsEditing(false);

    }, [chatId, editedName, originalName, updateChat]);

    const agentHref = `/chat/${chatId}/agent` as any;

    return (
        <BaseRow style={styles.outerContainer}>
            <View style={styles.titleInputArea}>
                {isEditing ? (
                    <View style={styles.editingHeaderContainer}>
                        <TextInput
                            value={editedName}
                            onChangeText={setEditedName}
                            style={[styles.headerInput, { color: theme.colors.text.primary }]}
                            placeholder="Chat Name"
                            placeholderTextColor={theme.colors.text.secondary}
                            autoFocus={true}
                            selectTextOnFocus
                        />
                    </View>
                ) : (
                    <View style={styles.headerContainer}>
                        <TextBody style={styles.headerTitle} numberOfLines={1}>{originalName}</TextBody>
                    </View>
                )}
            </View>

            <BaseRow style={styles.iconsArea}>
                {updatingChat ? (
                    <ActivityIndicator color={theme.colors.text.secondary} style={styles.headerIconPadding} />
                ) : isEditing ? (
                    <BaseRow style={styles.headerIconContainer}>
                        <Pressable onPress={handleCancel} style={styles.headerIconPadding}>
                            <Ionicons name="close-outline" size={iconSizes.medium} color={theme.colors.text.secondary} />
                        </Pressable>
                        <Pressable onPress={handleSubmit} style={styles.headerIconPadding}>
                            <Ionicons name="checkmark-outline" size={iconSizes.medium} color={theme.colors.text.primary} />
                        </Pressable>
                    </BaseRow>
                ) : (
                    <BaseRow style={styles.headerIconContainer}>
                        <Pressable onPress={handleEdit} style={styles.headerIconPadding}>
                            <Ionicons name="pencil-outline" size={iconSizes.small} color={theme.colors.text.secondary} />
                        </Pressable>
                        <Link href={agentHref} asChild>
                            <Pressable style={styles.headerIconPadding}>
                                <Ionicons
                                    name="desktop-outline"
                                    size={iconSizes.small}
                                    color={theme.colors.text.secondary}
                                />
                            </Pressable>
                        </Link>
                    </BaseRow>
                )}
            </BaseRow>
        </BaseRow>
    );
};

export const ChatDetailHeader = memo(ChatDetailHeaderComponent);

const getStyles = (colors: any) => StyleSheet.create({
    outerContainer: {
        flex: 1,
        alignItems: 'center',
    },
    titleInputArea: {
        flex: 1,
        alignItems: 'center',
    },
    iconsArea: {
        // width determined by content
    },
    headerContainer: {
        alignItems: 'center',
    },
    editingHeaderContainer: {
        width: '100%',
    },
    headerTitle: {
        fontWeight: 'bold',
    },
    headerInput: {
        fontSize: 16,
        paddingVertical: 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.layout?.border || 'gray',
        textAlign: 'center',
        width: '100%',
    },
    headerIconContainer: {
        alignItems: 'center',
        gap: gaps.small,
    },
    headerIconPadding: {
        paddingHorizontal: paddings.xsmall,
    }
}); 