
// Update packing spec status in Podio
export const updatePackingSpecStatus = async (
  specId: number, 
  status: 'pending-approval' | 'approved-by-customer' | 'changes-requested', 
  comments?: string,
  additionalData?: {
    approvedByName?: string;
    signature?: string;
    status?: string;
  }
): Promise<boolean> => {
  try {
    console.log(`Updating packing spec ${specId} to ${status}`, comments ? `with comments: ${comments}` : '');
    
    if (!hasValidTokens()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Prepare the fields to update
    const fieldsToUpdate: any = {};
    
    // Set the appropriate approval status category
    if (status === 'approved-by-customer') {
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvalStatus] = formatCategoryValue(PODIO_CATEGORIES.APPROVAL_STATUS.APPROVED_BY_CUSTOMER.id);
      
      // If we have approvedByName, add it
      if (additionalData?.approvedByName) {
        fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvedByName] = { value: additionalData.approvedByName };
      }
      
      // If we have signature file ID, add it
      if (additionalData?.signature) {
        fieldsToUpdate[PACKING_SPEC_FIELD_IDS.signature] = { value: additionalData.signature };
      }
      
      // Set approval date to now
      const now = new Date();
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvalDate] = { 
        start_date: formatPodioDate(now)
      };
    } else if (status === 'changes-requested') {
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.approvalStatus] = formatCategoryValue(PODIO_CATEGORIES.APPROVAL_STATUS.CHANGES_REQUESTED.id);
      
      // If we have customerRequestedChanges, add them
      if (comments) {
        fieldsToUpdate[PACKING_SPEC_FIELD_IDS.customerRequestedChanges] = { value: comments };
      }
    }
    
    // If the user selected a specific status via additionalData
    if (additionalData?.status) {
      fieldsToUpdate[PACKING_SPEC_FIELD_IDS.customerApprovalStatus] = formatCategoryValue(additionalData.status);
    }
    
    // Update the item in Podio
    await callPodioApi(`item/${specId}`, {
      method: 'PUT',
      body: JSON.stringify({ fields: fieldsToUpdate })
    });
    
    // If comments are provided, add them as a comment on the item
    if (comments) {
      try {
        await addCommentToPackingSpec(specId, comments);
      } catch (commentError) {
        console.error('Error adding comment:', commentError);
        // Continue even if comment addition fails
      }
    }
    
    console.log(`Successfully updated packing spec ${specId} to ${status}`);
    return true;
  } catch (error) {
    console.error('Error updating packing spec:', error);
    throw error; // Re-throw the error so we can handle it in the calling component
  }
};
