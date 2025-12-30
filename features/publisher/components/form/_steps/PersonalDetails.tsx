"use client"

import { PersonalDetailProps } from "@/features/publisher/types/form.types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PersonalDetails: React.FC<PersonalDetailProps> = ({ formData, onDataChange}) => {
    return (
        <>
        <div className="space-y-6 w-full">
            {/* Affiliate ID and Company Name - Single Column */}
            <div className="space-y-4 w-full">
                <div className="space-y-2">
                    <Label htmlFor="affiliateId" className="font-inter text-sm">
                        Affiliate ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="affiliateId"
                        value={formData.affiliateId}
                        onChange={(e) => onDataChange({ affiliateId: e.target.value })}
                        placeholder="Enter affiliate ID"
                        className="w-full h-12 font-inter publisher-form-input"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="companyName" className="font-inter text-sm">
                        Company Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => onDataChange({ companyName: e.target.value })}
                        placeholder="Enter company name"
                        className="h-12 font-inter publisher-form-input"
                    />
                </div>
            </div>

            {/* First Name and Last Name - Single Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-inter text-sm">
                        First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => onDataChange({ firstName: e.target.value })}
                        placeholder="Enter first name"
                        className="h-12 font-inter publisher-form-input"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-inter text-sm">
                        Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => onDataChange({ lastName: e.target.value })}
                        placeholder="Enter last name"
                        className="h-12 font-inter publisher-form-input"
                    />
                </div>
            </div>
        </div>
        </>
    )
}

export default PersonalDetails;