import React from 'react';
//https://recharts.org/en-US/examples/CustomContentOfTooltip

const StockTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{`${label} : ${payload[0].value} USD`}</p>
            </div>
        );
    }

    return null;
};

const DividendsByMonthTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{`${label} : ${payload[0].value} USD`}</p>
            </div>
        );
    }

    return null;
};

const DividendsByQuarterTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{`${label} : ${payload[0].value} USD`}</p>
            </div>
        );
    }

    return null;
};

const DividendsByYearTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{`${label} : ${payload[0].value} USD`}</p>
            </div>
        );
    }

    return null;
};

export { StockTooltip, DividendsByMonthTooltip, DividendsByQuarterTooltip, DividendsByYearTooltip };