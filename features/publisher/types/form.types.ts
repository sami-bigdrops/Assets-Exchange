import { PublisherFormData } from "../hooks/usePublisherForm";

export interface PersonalDetailProps {
    formData: PublisherFormData;
    onDataChange: (data: Partial<PublisherFormData>) => void;
}

export interface ContactDetailsProps {
    formData: PublisherFormData;
    onDataChange: (data: Partial<PublisherFormData>) => void;
}

export interface CreativeDetailsProps {
    formData: PublisherFormData;
    onDataChange: (data: Partial<PublisherFormData>) => void;
}