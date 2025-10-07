"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, DollarSign, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: number;
  account_number: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  allow_posting: boolean;
  current_balance: number;
  ytd_activity: number;
  level: number;
}

interface AccountTreeNode {
  account: Account;
  children: AccountTreeNode[];
}

interface AccountTreeViewProps {
  nodes: AccountTreeNode[];
  onAccountClick?: (account: Account) => void;
  onEditClick?: (account: Account) => void;
}

export function AccountTreeView({ nodes, onAccountClick, onEditClick }: AccountTreeViewProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.account.id}
          node={node}
          onAccountClick={onAccountClick}
          onEditClick={onEditClick}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  onAccountClick,
  onEditClick,
}: {
  node: AccountTreeNode;
  onAccountClick?: (account: Account) => void;
  onEditClick?: (account: Account) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(node.account.level === 0);
  const hasChildren = node.children.length > 0;
  const account = node.account;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Asset: "bg-blue-100 text-blue-800",
      Liability: "bg-red-100 text-red-800",
      Equity: "bg-purple-100 text-purple-800",
      Revenue: "bg-green-100 text-green-800",
      Expense: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const indentLevel = account.level * 24;

  return (
    <div>
      <div
        className={`flex items-center py-2 px-3 hover:bg-muted/50 rounded-md transition-colors ${
          !account.allow_posting ? "font-semibold" : ""
        }`}
        style={{ paddingLeft: `${indentLevel + 12}px` }}
      >
        {/* Expand/Collapse */}
        <div className="w-6 flex items-center justify-center">
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>

        {/* Account Number */}
        <div className="w-24 text-sm font-mono text-muted-foreground">
          {account.account_number}
        </div>

        {/* Account Name */}
        <div className="flex-1 text-sm">{account.account_name}</div>

        {/* Type Badge */}
        {account.level === 0 && (
          <Badge className={`${getAccountTypeColor(account.account_type)} mr-2`}>
            {account.account_type}
          </Badge>
        )}

        {/* Posting Badge */}
        {account.allow_posting && (
          <Badge variant="outline" className="mr-2 text-xs">
            Posting
          </Badge>
        )}

        {/* Balance */}
        {account.allow_posting && (
          <div className="w-32 text-right text-sm font-mono">
            {formatCurrency(account.current_balance)}
          </div>
        )}

        {/* Actions */}
        <div className="ml-2 flex items-center space-x-1">
          {onAccountClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAccountClick(account)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onEditClick && account.allow_posting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditClick(account)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.account.id}
              node={child}
              onAccountClick={onAccountClick}
              onEditClick={onEditClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

