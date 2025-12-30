import { useState, useEffect } from "react";

interface UseFromSubjectLinesModalProps {
    isOpen: boolean;
    initialFromLines?: string;
    initialSubjectLines?: string;
    onSave: (fromLines: string, subjectLines: string) => void;
    onClose: () => void;
}

export const useFromSubjectLinesModal = ({
    isOpen,
    initialFromLines = "",
    initialSubjectLines = "",
    onSave,
    onClose,
}: UseFromSubjectLinesModalProps) => {
    const [fromLines, setFromLines] = useState(initialFromLines);
    const [subjectLines, setSubjectLines] = useState(initialSubjectLines);
    const [errors, setErrors] = useState<{
        fromLines?: string;
        subjectLines?: string;
    }>({});

    useEffect(() => {
        if (isOpen) {
            setFromLines(initialFromLines);
            setSubjectLines(initialSubjectLines);
            setErrors({});
        }
    }, [isOpen, initialFromLines, initialSubjectLines]);

    const handleFromLinesChange = (value: string) => {
        setFromLines(value);
        if (errors.fromLines) {
            setErrors((prev) => ({ ...prev, fromLines: undefined }));
        }
    };

    const handleSubjectLinesChange = (value: string) => {
        setSubjectLines(value);
        if (errors.subjectLines) {
            setErrors((prev) => ({ ...prev, subjectLines: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: { fromLines?: string; subjectLines?: string } = {};

        if (!fromLines.trim()) {
            newErrors.fromLines = "From lines are required";
        }

        if (!subjectLines.trim()) {
            newErrors.subjectLines = "Subject lines are required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
        }

        return true;
    };

    const handleSave = () => {
        if (validate()) {
            onSave(fromLines.trim(), subjectLines.trim());
            handleClose();
        }
    };

    const handleClose = () => {
        setFromLines("");
        setSubjectLines("");
        setErrors({});
        onClose();
    };

    const getLineCount = (text: string): number => {
        if (!text.trim()) return 0;
        const lines = text.split("\n");
        return lines.length;
    };

    return {
        fromLines,
        subjectLines,
        errors,
        handleFromLinesChange,
        handleSubjectLinesChange,
        handleSave,
        handleClose,
        fromLinesCount: getLineCount(fromLines),
        subjectLinesCount: getLineCount(subjectLines),
    };
};

