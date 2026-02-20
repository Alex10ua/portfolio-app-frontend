import React from 'react';

const TooltipContainer = ({ children }) => (
    <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-md text-sm">
        {children}
    </div>
);

const StockTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <TooltipContainer>
                <p className="font-medium text-slate-900">{`${label}`}</p>
                <p className="text-indigo-600">{`Amount: ${payload[0].value} USD`}</p>
            </TooltipContainer>
        );
    }
    return null;
};

const DividendsByMonthTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <TooltipContainer>
                <p className="font-medium text-slate-900">{`${label}`}</p>
                <p className="text-indigo-600">{`Amount: ${payload[0].value} USD`}</p>
            </TooltipContainer>
        );
    }
    return null;
};

const DividendsByQuarterTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <TooltipContainer>
                <p className="font-medium text-slate-900">{`${label}`}</p>
                <p className="text-indigo-600">{`Amount: ${payload[0].value} USD`}</p>
            </TooltipContainer>
        );
    }
    return null;
};

const DividendsByYearTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <TooltipContainer>
                <p className="font-medium text-slate-900">{`${label}`}</p>
                <p className="text-indigo-600">{`Amount: ${payload[0].value} USD`}</p>
            </TooltipContainer>
        );
    }
    return null;
};

export { StockTooltip, DividendsByMonthTooltip, DividendsByQuarterTooltip, DividendsByYearTooltip };