"use client";

import { PencilLine, Info } from "lucide-react";
import React from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFromSubjectLinesModal } from "@/features/publisher/view-models/fromSubjectLinesModal.viewModel";

interface FromSubjectLinesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (fromLines: string, subjectLines: string) => void;
    initialFromLines?: string;
    initialSubjectLines?: string;
}

const FromSubjectLinesModal: React.FC<FromSubjectLinesModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialFromLines = "",
    initialSubjectLines = "",
}) => {
    const variables = getVariables();
    const {
        fromLines,
        subjectLines,
        errors,
        handleFromLinesChange,
        handleSubjectLinesChange,
        handleSave,
        handleClose,
        fromLinesCount,
        subjectLinesCount,
    } = useFromSubjectLinesModal({
        isOpen,
        initialFromLines,
        initialSubjectLines,
        onSave,
        onClose,
    });

    const guidelines = [
        "Enter one from line or subject line per row",
        "Each line will be used separately in email campaigns",
        "Make sure each line is clear and compelling",
        "Avoid special characters that might cause issues",
    ];

    return (
        <>
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        .from-subject-lines-textarea:focus-visible {
                            outline: none !important;
                            border-color: ${variables.colors.inputRingColor} !important;
                            box-shadow: 0 0 0 3px ${variables.colors.inputRingColor}50 !important;
                        }
                        .from-subject-lines-textarea::selection {
                            background-color: ${variables.colors.inputRingColor}40 !important;
                            color: ${variables.colors.inputTextColor} !important;
                        }
                        .from-subject-lines-textarea::-moz-selection {
                            background-color: ${variables.colors.inputRingColor}40 !important;
                            color: ${variables.colors.inputTextColor} !important;
                        }
                    `,
                }}
            />
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent
                    className="max-w-3xl! max-h-[95vh]"
                    style={{
                        backgroundColor: variables.colors.cardBackground,
                    }}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <PencilLine
                                className="h-6 w-6"
                                style={{ color: variables.colors.titleColor }}
                            />
                            <DialogTitle>
                                From & Subject Lines
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <DialogBody className="max-h-[calc(90vh-180px)] overflow-y-auto">
                        <div className="space-y-6">
                            <div
                                className="p-4 rounded-md border"
                                style={{
                                    backgroundColor: variables.colors.background,
                                    borderColor: variables.colors.inputBorderColor,
                                }}
                            >
                                <div className="flex items-start gap-2">
                                    <Info
                                        className="h-4 w-4 mt-0.5"
                                        style={{ color: variables.colors.titleColor }}
                                    />
                                    <div className="text-sm">
                                        <p
                                            className="font-medium mb-2"
                                            style={{ color: variables.colors.titleColor }}
                                        >
                                            Guidelines:
                                        </p>
                                        <ul className="space-y-1 text-xs list-disc list-inside">
                                            {guidelines.map((item, index) => (
                                                <li
                                                    key={index}
                                                    style={{
                                                        color: variables.colors.descriptionColor,
                                                    }}
                                                >
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label
                                    htmlFor="fromLines"
                                    className="text-sm font-medium font-inter"
                                    style={{ color: variables.colors.labelColor }}
                                >
                                    From Lines <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="fromLines"
                                    placeholder="Enter from lines, one per line..."
                                    value={fromLines}
                                    onChange={(e) =>
                                        handleFromLinesChange(e.target.value)
                                    }
                                    rows={5}
                                    className={`w-full font-inter from-subject-lines-textarea ${
                                        errors.fromLines
                                            ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                                            : ""
                                    }`}
                                    style={{
                                        backgroundColor:
                                            variables.colors.inputBackgroundColor,
                                        borderColor: errors.fromLines
                                            ? variables.colors.inputErrorColor
                                            : variables.colors.inputBorderColor,
                                        color: variables.colors.inputTextColor,
                                    }}
                                />
                                {errors.fromLines && (
                                    <p
                                        className="text-sm"
                                        style={{
                                            color: variables.colors.inputErrorColor,
                                        }}
                                    >
                                        {errors.fromLines}
                                    </p>
                                )}
                                <p
                                    className="text-xs"
                                    style={{
                                        color: variables.colors.descriptionColor,
                                    }}
                                >
                                    Enter one from line per row. Each line will be
                                    used separately in email campaigns.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label
                                    htmlFor="subjectLines"
                                    className="text-sm font-medium font-inter"
                                    style={{ color: variables.colors.labelColor }}
                                >
                                    Subject Lines <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="subjectLines"
                                    placeholder="Enter subject lines, one per line..."
                                    value={subjectLines}
                                    onChange={(e) =>
                                        handleSubjectLinesChange(e.target.value)
                                    }
                                    rows={5}
                                    className={`w-full font-inter from-subject-lines-textarea ${
                                        errors.subjectLines
                                            ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                                            : ""
                                    }`}
                                    style={{
                                        backgroundColor:
                                            variables.colors.inputBackgroundColor,
                                        borderColor: errors.subjectLines
                                            ? variables.colors.inputErrorColor
                                            : variables.colors.inputBorderColor,
                                        color: variables.colors.inputTextColor,
                                    }}
                                />
                                {errors.subjectLines && (
                                    <p
                                        className="text-sm"
                                        style={{
                                            color: variables.colors.inputErrorColor,
                                        }}
                                    >
                                        {errors.subjectLines}
                                    </p>
                                )}
                                <p
                                    className="text-xs"
                                    style={{
                                        color: variables.colors.descriptionColor,
                                    }}
                                >
                                    Enter one subject line per row. Each line will be
                                    used separately in email campaigns.
                                </p>
                            </div>

                            <div
                                className="flex justify-between text-xs"
                                style={{
                                    color: variables.colors.descriptionColor,
                                }}
                            >
                                <span>
                                    From Lines: {fromLinesCount} {fromLinesCount === 1 ? "line" : "lines"}
                                </span>
                                <span>
                                    Subject Lines: {subjectLinesCount} {subjectLinesCount === 1 ? "line" : "lines"}
                                </span>
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter className="flex gap-2 justify-between">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="w-full h-12 font-inter font-medium flex-1"
                            style={{
                                backgroundColor:
                                    variables.colors.buttonOutlineBackgroundColor,
                                borderColor: variables.colors.buttonOutlineBorderColor,
                                color: variables.colors.buttonOutlineTextColor,
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="w-full h-12 font-inter font-medium flex-1"
                            disabled={!fromLines.trim() || !subjectLines.trim()}
                            style={{
                                backgroundColor:
                                    variables.colors.buttonDefaultBackgroundColor,
                                color: variables.colors.buttonDefaultTextColor,
                            }}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default FromSubjectLinesModal;

