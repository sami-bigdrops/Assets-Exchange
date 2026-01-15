import { useState } from "react";

export interface PublisherFormData {
    affiliateId: string;
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    telegramId: string;
    offerId: string;
    creativeType: string;
    additionalNotes: string;
    fromLines: string;
    subjectLines: string;
    priority: string;
}

export const usePublisherForm = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<PublisherFormData>({
        affiliateId: "",
        companyName: "",
        firstName: "",
        lastName: "",
        email: "",
        telegramId: "",
        offerId: "",
        creativeType: "",
        additionalNotes: "",
        fromLines: "",
        subjectLines: "",
        priority: "medium"
    });

    const onDataChange = (data: Partial<PublisherFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const nextStep = () => {
        if (currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const previousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const goToStep = (step: number) => {
        if (step >= 1 && step <= 3) {
            setCurrentStep(step);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error("Submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        currentStep,
        formData,
        onDataChange,
        nextStep,
        previousStep,
        goToStep,
        isSubmitting,
        handleSubmit
    };
};

